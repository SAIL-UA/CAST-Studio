# backend/api/tasks.py
from celery import shared_task
import os, base64, re, logging, json, mimetypes, time
from functools import lru_cache
from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from openai import OpenAI
from .pydandtic import STORY_SCAFFOLDS

logger = logging.getLogger(__name__)


def _active_ws(user):
    from api.workspace_ops import get_or_create_active_workspace

    return get_or_create_active_workspace(user)


def update_progress(
    user_id,
    task_type,
    task_id,
    current_stage,
    total_stages,
    stage_name,
    substage=None,
    error=None,
):
    """Update task progress in the database for frontend polling."""
    TaskProgress = _get_model("api", "TaskProgress")
    TaskProgress.objects.update_or_create(
        task_id=task_id,
        defaults={
            "user_id": user_id,
            "task_type": task_type,
            "current_stage": current_stage,
            "total_stages": total_stages,
            "stage_name": stage_name,
            "substage": substage,
            "error": error,
        },
    )


# Guardrail against oversized payloads when attaching image data.
MAX_FEEDBACK_IMAGES = 12

# Human-readable scaffold element metadata keyed by story structure id.
# These labels are used when building scaffold_data for the storyboard and narrative.
SCAFFOLD_ELEMENT_LABELS: dict[str, dict[int, dict[str, str]]] = {
    "cause_and_effect": {
        1: {"id": "cause", "label": "Cause"},
        2: {"id": "effect", "label": "Effect"},
    },
    "question_answer": {
        1: {"id": "question", "label": "Question"},
        2: {"id": "answer", "label": "Answer"},
    },
    "time_based": {
        1: {"id": "event_1", "label": "Event 1"},
        2: {"id": "event_2", "label": "Event 2"},
        3: {"id": "event_3", "label": "Event 3"},
        4: {"id": "event_4", "label": "Event 4"},
    },
    "factor_analysis": {
        1: {"id": "factor_1", "label": "Factor 1"},
        2: {"id": "factor_2", "label": "Factor 2"},
        3: {"id": "factor_3", "label": "Factor 3"},
    },
    "overview_to_detail": {
        1: {"id": "overview", "label": "Overview"},
        2: {"id": "detail_1", "label": "Detail 1"},
        3: {"id": "detail_2", "label": "Detail 2"},
        4: {"id": "detail_3", "label": "Detail 3"},
    },
    "problem_solution": {
        1: {"id": "problem", "label": "Problem"},
        2: {"id": "solution", "label": "Solution"},
    },
    "comparative": {
        1: {"id": "item_1", "label": "Item 1"},
        2: {"id": "item_2", "label": "Item 2"},
    },
    "workflow_process": {
        1: {"id": "stage_1", "label": "Stage 1"},
        2: {"id": "stage_2", "label": "Stage 2"},
        3: {"id": "stage_3", "label": "Stage 3"},
    },
    "shock_lead": {
        1: {"id": "shock_fact", "label": "Shock Fact"},
        2: {"id": "explanatory_factors", "label": "Explanatory Factors"},
    },
}


def _openai_client():
    # create lazily to avoid creating clients during import/migrations
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _publish_story_stream_event(user_id, event: str, **payload) -> None:
    """
    Push a story-stream event to the requesting user's Channels group so open
    WebSocket subscribers can render it. No-op on any failure — streaming is a
    UX enhancement, not required for the task to complete.

    event: 'start' | 'chunk' | 'end' | 'error'
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        from api.consumers import story_stream_group_name

        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(
            story_stream_group_name(user_id),
            {"type": "story.event", "event": event, **payload},
        )
    except Exception:
        logger.exception("failed to publish story-stream event %s", event)


def _run_completion(client, params: dict, on_chunk=None) -> str:
    """
    Wrap chat.completions.create with optional streaming. When on_chunk is
    provided, use stream=True, iterate over deltas, invoke on_chunk(delta) as
    text arrives, and return the accumulated content. Otherwise, plain
    non-streaming call.
    """
    if on_chunk is None:
        resp = client.chat.completions.create(**params)
        return (resp.choices[0].message.content or "").strip()

    streaming_params = dict(params)
    streaming_params["stream"] = True
    stream = client.chat.completions.create(**streaming_params)
    accumulator: list[str] = []
    for chunk in stream:
        choices = chunk.choices or []
        if not choices:
            continue
        delta = choices[0].delta.content
        if not delta:
            continue
        accumulator.append(delta)
        try:
            on_chunk(delta)
        except Exception:
            logger.exception("story stream on_chunk failed")
    return "".join(accumulator).strip()


def _get_model(app_label, model_name):
    # late-binding model lookup; safe before app registry 'ready'
    return apps.get_model(app_label, model_name)


@lru_cache(maxsize=None)
def _load_prompt(filename: str) -> str:
    """Lazy, cached prompt loader."""
    try:
        # Try project-relative prompts directory (backend/prompts/)
        prompts_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "prompts"
        )
        prompt_path = os.path.join(prompts_dir, filename)
        if os.path.exists(prompt_path):
            with open(prompt_path, "r") as f:
                return f.read().strip()

        # Fallback to BASE_DIR/backend/prompts (if BASE_DIR is set)
        base_dir = getattr(settings, "BASE_DIR", "")
        fallback_dir = os.path.join(base_dir, "backend", "prompts")
        prompt_path = os.path.join(fallback_dir, filename)
        with open(prompt_path, "r") as f:
            return f.read().strip()
    except Exception as e:
        logger.error(f"Error loading prompt {filename}: {e}")
        return f"Error loading prompt: {filename}"


@lru_cache(maxsize=256)
def _image_to_data_url(relative_path: str) -> str | None:
    """Convert an image on disk to a base64 data URL for OpenAI image inputs."""
    data_root = os.getenv("DATA_PATH")
    if not data_root:
        logger.warning(
            "DATA_PATH is not configured; skipping image embedding for feedback."
        )
        return None

    try:
        # Images are stored directly in DATA_PATH with filename only
        abs_path = os.path.abspath(os.path.join(data_root, relative_path))
        if not os.path.exists(abs_path):
            logger.warning(f"Image not found for feedback embedding: {abs_path}")
            return None

        with open(abs_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("ascii")

        mime_type, _ = mimetypes.guess_type(abs_path)
        if not mime_type:
            mime_type = "image/jpeg"

        return f"data:{mime_type};base64,{encoded}"
    except Exception as exc:
        logger.error(f"Error encoding image {relative_path} for feedback: {exc}")
        return None


def _categorize_figure(description: str) -> str:
    """Categorize a single figure based on its description using OpenAI API.

    DISABLED (2026-08-23): categorization is now a no-op. The label was soft
    context for Sequence/Compose and never rendered in the UI; modern
    descriptions carry enough signal that the sequencer + chosen story
    structure enforce the arc without needing an explicit tag. Skipping the
    call saves roughly one sequential gpt-4o round-trip per figure — the
    dominant pre-stream cost on larger workspaces. To restore, delete the
    early return below and uncomment the original body."""
    return ""

    # prompt = f"""
    # ### Input
    # This is a single figure description:
    # {description}
    #
    # {_load_prompt('categorize_figures.txt')}
    # """.strip()
    #
    # try:
    #     client = _openai_client()
    #     resp = client.chat.completions.create(
    #         model="gpt-4o",
    #         messages=[
    #             {"role": "system", "content": "You are a helpful assistant."},
    #             {"role": "user", "content": prompt},
    #         ],
    #         temperature=0.1,
    #         timeout=30,
    #     )
    #     return resp.choices[0].message.content.strip()
    # except Exception as e:
    #     logger.error(f"Error categorizing figure: {e}")
    #     return f"Error categorizing figure: {e}"


def _understand_theme_objective(
    fig_descriptions: str, rqs_data: list | None = None
) -> str:
    """
    Identify theme and objective based on all figure descriptions.

    When AI_RQS_IN_STRUCTURE is on and rqs_data is provided, the research questions
    are fed in so the theme can be framed in terms of what the user is trying to
    answer, not just what the figures happen to show.
    """
    rqs_block = ""
    if getattr(settings, "AI_RQS_IN_STRUCTURE", True) and rqs_data:
        rqs_block = (
            _format_rqs_prompt_section(rqs_data)
            + "\nFrame the theme and objective around what the user is trying to answer with these questions. "
            "Trust the user's linked figures — do not second-guess them.\n"
        )

    prompt = f"""
### Input
Descriptions of figures:
{fig_descriptions}
{rqs_block}
{_load_prompt('understand_theme_objective.txt')}
""".strip()

    try:
        client = _openai_client()
        resp = client.chat.completions.create(
            # gpt-4o-mini: theme is a short summary, no complex reasoning. Mini
            # runs ~2-3x faster than gpt-4o with negligible quality loss here.
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            timeout=30,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error understanding theme and objective: {e}")
        return f"Error understanding theme and objective: {e}"


def _choose_story_structure_id(
    all_descriptions_text: str, rqs_data: list | None = None
) -> str:
    """
    Ask the LLM to choose the best story structure id for the given figures.

    The returned id will always be one of the keys in STORY_SCAFFOLDS.

    When AI_RQS_IN_STRUCTURE is on and rqs_data is provided, the user's research
    questions are prepended so the model can bias structure choice toward the
    kind of question being asked (comparative questions favour Comparative, causal
    ones favour Cause/Effect, etc.).
    """
    # Build prompt using the shared story_definition reference
    story_definitions = _load_prompt("story_definition.txt")
    allowed_ids = list(STORY_SCAFFOLDS.keys())

    rqs_block = ""
    if getattr(settings, "AI_RQS_IN_STRUCTURE", True) and rqs_data:
        rqs_block = (
            _format_rqs_prompt_section(rqs_data)
            + "\nThe user's research questions above are directive: prefer the "
            "structure that best answers them. Comparative questions favour Comparative; "
            "cause/effect questions favour Cause and Effect; questions about progression "
            "over time favour Time-Based; overview-then-detail questions favour "
            "Overview to Detail. Trust the user's linked figures — do not second-guess them.\n"
        )

    prompt = f"""
### Input
Descriptions of figures for this story:
{all_descriptions_text}
{rqs_block}
Reference narrative structures:
{story_definitions}

### Task
Choose the single most appropriate narrative structure *id* for this story.
You must pick exactly one id from this list:
{", ".join(allowed_ids)}

Respond ONLY with a JSON object of the form:
{{"id": "<one_of_the_ids_above>"}}
""".strip()

    try:
        client = _openai_client()

        schema = {
            "name": "story_structure_choice",
            "schema": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "id": {
                        "type": "string",
                        "enum": allowed_ids,
                    }
                },
                "required": ["id"],
            },
            "strict": True,
        }

        # Structure choice is a strict-schema JSON classification into ~6 enum
        # values — mini is more than capable and shaves ~1–2 s off the AI Assistance
        # pre-stream wait. If picks start looking odd, revert to gpt-4o here.
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            timeout=30,
            response_format={"type": "json_schema", "json_schema": schema},
        )

        choice = None
        try:
            parsed = resp.choices[0].message.parsed
        except Exception:
            parsed = None

        if not parsed:
            content = (resp.choices[0].message.content or "").strip()
            parsed = _extract_json_object(content)

        if isinstance(parsed, dict) and isinstance(parsed.get("id"), str):
            candidate = parsed["id"].strip()
            if candidate in STORY_SCAFFOLDS:
                return candidate

        # Fallback: default to the first known id
        return allowed_ids[0]
    except Exception as e:
        logger.error(f"Error choosing story structure id: {e}")
        # Fallback: default to the first known id
        return list(STORY_SCAFFOLDS.keys())[0]


def _resolve_story_structure_id(
    story_structure_id: str | None,
    all_descriptions_text: str,
    rqs_data: list | None = None,
) -> str:
    """
    Resolve the final story structure id used for generation.

    Keeps a valid caller-provided id, otherwise auto-selects one. When rqs_data is
    supplied and AI_RQS_IN_STRUCTURE is on, structure choice is biased by the RQs.
    """
    normalized_id = (story_structure_id or "").strip()
    if normalized_id in STORY_SCAFFOLDS:
        return normalized_id

    # Explicit AI-autoselect signals from UI and empty values.
    if normalized_id.lower() not in {"", "ai assistance"}:
        logger.warning(
            "[NARRATIVE] Unknown story_structure_id '%s'; auto-selecting a valid scaffold.",
            story_structure_id,
        )

    chosen = _choose_story_structure_id(all_descriptions_text, rqs_data=rqs_data)
    if chosen in STORY_SCAFFOLDS:
        return chosen

    fallback_id = next(iter(STORY_SCAFFOLDS))
    logger.warning(
        "[NARRATIVE] Auto-selected invalid scaffold '%s'; falling back to '%s'.",
        chosen,
        fallback_id,
    )
    return fallback_id


def _sequence_figures(
    fig_descriptions_category: dict,
    theme: str,
    story_structure_id: str,
    rqs_data: list | None = None,
) -> str:
    """Generate a recommended figure sequence given per-figure categories, theme, and the provided story structure."""
    rqs_block = ""
    if getattr(settings, "AI_RQS_IN_SEQUENCE", True) and rqs_data:
        rqs_block = (
            _format_rqs_prompt_section(rqs_data)
            + "\nSequence the figures so the research questions get answered in a "
            "coherent progression — foundational questions first, dependent ones after. "
            "Prioritise figures the user has linked to a question; the user's links are "
            "authoritative signal of importance, not to be second-guessed.\n"
        )

    base_prompt = f"""
### Input
Descriptions and categories of figures:
{fig_descriptions_category}

Topic theme and objective:
{theme}
{rqs_block}
{_load_prompt('sequence_figures.txt')}
""".strip()

    # Append the provided story structure (from STORY_SCAFFOLDS filename mapping)
    structure_info = STORY_SCAFFOLDS.get(story_structure_id)
    if not structure_info:
        fallback_id = next(iter(STORY_SCAFFOLDS))
        logger.warning(
            "[NARRATIVE] _sequence_figures received invalid story_structure_id '%s'; using '%s'.",
            story_structure_id,
            fallback_id,
        )
        structure_info = STORY_SCAFFOLDS[fallback_id]
    structure_name = structure_info["name"]
    structure_description = _load_prompt(structure_info["filename"])

    structure_prompt = f"""

### Provided Story Structure (use this structure)
Use the following story structure. Its description is given below.
**{structure_name}**:
{structure_description}

"""
    base_prompt += structure_prompt

    try:
        client = _openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": base_prompt},
            ],
            temperature=0.1,
            timeout=30,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error sequencing figures: {e}")
        return f"Error sequencing figures: {e}"


def _build_story(
    fig_descriptions_category: dict,
    sequence: str,
    rqs_data: list | None = None,
    on_chunk=None,
) -> str:
    """Build a narrative using per-figure categories and the recommended sequence.

    When AI_RQS_IN_STORY is on and rqs_data is provided, the research questions
    are passed as directive context. Per product decision the narrative itself keeps
    them implicit — do not name RQs in the story prose. The reasoning tab surfaces
    a separate "how each RQ informed the story" section instead.
    """
    rqs_block = ""
    if getattr(settings, "AI_RQS_IN_STORY", True) and rqs_data:
        rqs_block = (
            _format_rqs_prompt_section(rqs_data)
            + "\nWrite the narrative so it answers these research questions in the "
            "order suggested by the sequence. Keep the RQs IMPLICIT — do not name "
            "them in the prose; instead, emphasise the figures the user has linked "
            "to each question. Trust the user's links.\n"
        )

    prompt = f"""
### Input
Descriptions and categories of figures:
{fig_descriptions_category}

Sequence:
{sequence}
{rqs_block}
{_load_prompt('build_story.txt')}
""".strip()

    try:
        client = _openai_client()
        return _run_completion(
            client,
            {
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "timeout": 60,
            },
            on_chunk=on_chunk,
        )
    except Exception as e:
        logger.error(f"Error building story: {e}")
        return f"Error building story: {e}"


def _sequence_figures_with_groups(
    groups_data: list,
    ungrouped_data: dict,
    theme: str,
    story_structure_id: str,
    rqs_data: list | None = None,
) -> str:
    """
    Sequence figures considering both groups and ungrouped figures.

    Args:
        groups_data: List of dicts with group info and figures
        ungrouped_data: Dict of ungrouped figures with descriptions/categories
        theme: Overall theme and objective
        story_structure_id: Story structure ID
        rqs_data: Optional research questions; each figure/group carries its own
            rq_labels which get inlined below when the AI_RQS_IN_SEQUENCE flag is on.
    """
    rq_aware = getattr(settings, "AI_RQS_IN_SEQUENCE", True) and bool(rqs_data)

    # Format groups for the prompt
    groups_text = ""
    for group in groups_data:
        rq_suffix = _format_rq_labels(group.get("rq_labels") or []) if rq_aware else ""
        groups_text += f"\n### Group: {group['name']}{rq_suffix}\n"
        groups_text += f"Description: {group['description']}\n"
        groups_text += "Figures in this group:\n"
        for fig_file, fig_info in group["figures"].items():
            fig_rq_suffix = (
                _format_rq_labels(fig_info.get("rq_labels") or []) if rq_aware else ""
            )
            groups_text += f"  - {fig_file}{fig_rq_suffix}: {fig_info['description']} (Category: {fig_info['category']})\n"

    # Format ungrouped figures
    ungrouped_text = "\n### Ungrouped Figures:\n"
    for fig_file, fig_info in ungrouped_data.items():
        fig_rq_suffix = (
            _format_rq_labels(fig_info.get("rq_labels") or []) if rq_aware else ""
        )
        ungrouped_text += f"  - {fig_file}{fig_rq_suffix}: {fig_info['description']} (Category: {fig_info['category']})\n"

    rqs_block = ""
    if rq_aware:
        rqs_block = (
            _format_rqs_prompt_section(rqs_data)
            + "\nSequence the figures so the research questions get answered in a "
            "coherent progression. The user's linked figures/groups are authoritative "
            "signal of relevance — do not second-guess them.\n"
        )

    base_prompt = f"""
### Input
{groups_text}
{ungrouped_text}

Topic theme and objective:
{theme}
{rqs_block}
{_load_prompt('sequence_figures_with_groups.txt')}
""".strip()

    # Append the provided story structure (from STORY_SCAFFOLDS filename mapping)
    structure_info = STORY_SCAFFOLDS.get(story_structure_id)
    if not structure_info:
        fallback_id = next(iter(STORY_SCAFFOLDS))
        logger.warning(
            "[NARRATIVE] _sequence_figures_with_groups received invalid story_structure_id '%s'; using '%s'.",
            story_structure_id,
            fallback_id,
        )
        structure_info = STORY_SCAFFOLDS[fallback_id]
    structure_name = structure_info["name"]
    structure_description = _load_prompt(structure_info["filename"])

    structure_prompt = f"""

### Provided Story Structure (use this structure)
Use the following story structure. Its description is given below.
**{structure_name}**:
{structure_description}

"""
    base_prompt += structure_prompt

    try:
        client = _openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": base_prompt},
            ],
            temperature=0.1,
            timeout=30,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error sequencing figures with groups: {e}")
        return f"Error sequencing figures with groups: {e}"


def _build_story_with_groups(
    groups_data: list,
    ungrouped_data: dict,
    sequence: str,
    rqs_data: list | None = None,
    on_chunk=None,
) -> str:
    """
    Build a narrative that respects group structure and integrates ungrouped figures.

    Args:
        groups_data: List of dicts with group info and figures
        ungrouped_data: Dict of ungrouped figures with descriptions/categories
        sequence: Recommended sequence from sequencing step
        rqs_data: Optional research questions. See _build_story docstring for the
            implicit-in-prose policy.
    """
    rq_aware = getattr(settings, "AI_RQS_IN_STORY", True) and bool(rqs_data)

    def _rq(entry):
        return _format_rq_labels(entry.get("rq_labels") or []) if rq_aware else ""

    # Format groups for the prompt
    groups_text = ""
    for group in groups_data:
        groups_text += f"\n### Group: {group['name']}{_rq(group)}\n"
        groups_text += f"Description: {group['description']}\n"
        groups_text += "Figures in this group:\n"
        for fig_file, fig_info in group["figures"].items():
            groups_text += f"  - {fig_file}{_rq(fig_info)}: {fig_info['description']} (Category: {fig_info['category']})\n"

    # Format ungrouped figures
    ungrouped_text = "\n### Ungrouped Figures:\n"
    for fig_file, fig_info in ungrouped_data.items():
        ungrouped_text += f"  - {fig_file}{_rq(fig_info)}: {fig_info['description']} (Category: {fig_info['category']})\n"

    rqs_block = ""
    if rq_aware:
        rqs_block = (
            _format_rqs_prompt_section(rqs_data)
            + "\nWrite the narrative so it answers these questions in the order the "
            "sequence implies. Keep the questions IMPLICIT — do not name them in prose. "
            "Emphasise figures the user has linked to each question. Trust the user's links.\n"
        )

    prompt = f"""
### Input
{groups_text}
{ungrouped_text}

Sequence:
{sequence}
{rqs_block}
{_load_prompt('build_story_with_groups.txt')}
""".strip()

    try:
        client = _openai_client()
        return _run_completion(
            client,
            {
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "timeout": 60,
            },
            on_chunk=on_chunk,
        )
    except Exception as e:
        logger.error(f"Error building story with groups: {e}")
        return f"Error building story with groups: {e}"


def _sequence_figures_with_scaffolds(
    scaffold_data: dict,
    extra_groups: list,
    extra_figures: dict,
    theme: str,
    story_structure_id: str,
    rqs_data: list | None = None,
) -> str:
    """
    Sequence figures considering scaffold elements, their groups, and any extra non-scaffold groups/figures.

    Args:
        scaffold_data: Dict with scaffold structure as returned by _build_scaffold_data
        extra_groups: List of non-scaffold group dicts (same shape as _build_group_data output)
        extra_figures: Dict of non-scaffold, ungrouped figures
        theme: Overall theme and objective
        story_structure_id: Story structure ID
        rqs_data: Optional research questions. When AI_RQS_IN_SEQUENCE is on and rqs_data
            is truthy, every figure/group carrying rq_labels gets an inline
            [answers: Q1, Q3] suffix and the Research Questions block is prepended.
    """
    rq_aware = getattr(settings, "AI_RQS_IN_SEQUENCE", True) and bool(rqs_data)

    def _rq(entry):
        return _format_rq_labels(entry.get("rq_labels") or []) if rq_aware else ""

    is_multi = scaffold_data.get("multi", False)
    elements_text = ""

    if is_multi:
        # Group elements by scaffold name for clarity
        from collections import defaultdict

        scaffold_groups = defaultdict(list)
        for element in scaffold_data.get("elements", []):
            scaffold_name = element.get("_scaffold_name", "Unknown")
            scaffold_groups[scaffold_name].append(element)

        for scaffold_name, elements in scaffold_groups.items():
            elements_text += f"\n## Scaffold: {scaffold_name}\n"
            for element in elements:
                element_name = element.get("name") or f"Element {element.get('number')}"
                elements_text += f"\n### Element: {element_name}\n"
                elements_text += "Groups in this element:\n"
                for group in element.get("groups", []):
                    elements_text += f"- Group: {group.get('name', '')}{_rq(group)}\n"
                    elements_text += f"  Description: {group.get('description', '')}\n"
                    elements_text += "  Figures:\n"
                    for fig_file, fig_info in group.get("figures", {}).items():
                        elements_text += f"    - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"
                element_figs = element.get("figures", {})
                if element_figs:
                    elements_text += "Ungrouped figures in this element:\n"
                    for fig_file, fig_info in element_figs.items():
                        elements_text += f"  - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"
    else:
        for element in scaffold_data.get("elements", []):
            element_name = element.get("name") or f"Element {element.get('number')}"
            elements_text += f"\n### Scaffold Element: {element_name}\n"
            elements_text += "Groups in this element:\n"
            for group in element.get("groups", []):
                elements_text += f"- Group: {group.get('name', '')}{_rq(group)}\n"
                elements_text += f"  Description: {group.get('description', '')}\n"
                elements_text += "  Figures:\n"
                for fig_file, fig_info in group.get("figures", {}).items():
                    elements_text += f"    - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"
            element_figs = element.get("figures", {})
            if element_figs:
                elements_text += "Ungrouped figures in this element:\n"
                for fig_file, fig_info in element_figs.items():
                    elements_text += f"  - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    extra_groups_text = ""
    if extra_groups:
        extra_groups_text += "\n### Additional Non-Scaffold Groups:\n"
        for group in extra_groups:
            extra_groups_text += f"- Group: {group.get('name', '')}{_rq(group)}\n"
            extra_groups_text += f"  Description: {group.get('description', '')}\n"
            extra_groups_text += "  Figures:\n"
            for fig_file, fig_info in group.get("figures", {}).items():
                extra_groups_text += f"    - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    extra_figs_text = ""
    if extra_figures:
        extra_figs_text += "\n### Additional Ungrouped Figures (Non-Scaffold):\n"
        for fig_file, fig_info in extra_figures.items():
            extra_figs_text += f"  - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    rqs_block = ""
    if rq_aware:
        rqs_block = (
            _format_rqs_prompt_section(rqs_data)
            + "\nWithin each scaffold element, sequence figures so the research questions "
            "get answered in a coherent progression. The user's linked figures/groups are "
            "authoritative signal of relevance — do not second-guess them.\n"
        )

    base_prompt = f"""
### Input
Scaffold structure (elements, groups, and figures):
{elements_text}
{extra_groups_text}
{extra_figs_text}

Topic theme and objective:
{theme}
{rqs_block}
{_load_prompt('sequence_figures_with_scaffolds.txt')}
""".strip()

    if is_multi:
        # Multi-scaffold: list all scaffold structures instead of one
        scaffold_names = scaffold_data.get("scaffold_names", [])
        structure_prompt = f"""

### Multiple Narrative Structures
This workspace uses multiple scaffolds: {', '.join(scaffold_names)}.
Sequence all figures across all scaffolds, respecting each scaffold's internal ordering while finding a coherent overall sequence.

"""
        base_prompt += structure_prompt
    else:
        structure_info = STORY_SCAFFOLDS.get(story_structure_id)
        if not structure_info:
            fallback_id = next(iter(STORY_SCAFFOLDS))
            logger.warning(
                "[NARRATIVE] _sequence_figures_with_scaffolds received invalid story_structure_id '%s'; using '%s'.",
                story_structure_id,
                fallback_id,
            )
            structure_info = STORY_SCAFFOLDS[fallback_id]
        structure_name = structure_info["name"]
        structure_description = _load_prompt(structure_info["filename"])

        structure_prompt = f"""

### Provided Story Structure (use this structure)
Use the following story structure. Its description is given below.
**{structure_name}**:
{structure_description}

"""
        base_prompt += structure_prompt

    try:
        client = _openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": base_prompt},
            ],
            temperature=0.1,
            timeout=30,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error sequencing figures with scaffolds: {e}")
        return f"Error sequencing figures with scaffolds: {e}"


FLOW_SCAFFOLDS = {"linear", "inverted_pyramid"}


def _build_story_with_scaffolds(
    scaffold_data: dict,
    extra_groups: list,
    extra_figures: dict,
    sequence: str,
    story_structure_id: str | None = None,
    rqs_data: list | None = None,
    on_chunk=None,
) -> str:
    """
    Build a narrative that explicitly reflects scaffold elements, their groups, and any extra groups/figures.

    Args:
        scaffold_data: Dict with scaffold structure as returned by _build_scaffold_data
        extra_groups: List of non-scaffold group dicts
        extra_figures: Dict of non-scaffold, ungrouped figures
        sequence: Recommended sequence from sequencing step
        story_structure_id: Optional structure id to determine prompt selection
        rqs_data: Optional research questions; see _build_story docstring for policy.
    """
    rq_aware = getattr(settings, "AI_RQS_IN_STORY", True) and bool(rqs_data)

    def _rq(entry):
        return _format_rq_labels(entry.get("rq_labels") or []) if rq_aware else ""

    is_multi = scaffold_data.get("multi", False)
    is_flow = story_structure_id in FLOW_SCAFFOLDS if story_structure_id else False
    elements_text = ""

    if is_multi:
        # Group elements by scaffold name for the multi-scaffold prompt
        from collections import defaultdict

        scaffold_groups = defaultdict(list)
        for element in scaffold_data.get("elements", []):
            scaffold_name = element.get("_scaffold_name", "Unknown")
            scaffold_groups[scaffold_name].append(element)

        for scaffold_name, elements in scaffold_groups.items():
            elements_text += f"\n## Scaffold: {scaffold_name}\n"
            for element in elements:
                element_name = element.get("name") or f"Element {element.get('number')}"
                elements_text += f"\n### Element: {element_name}\n"
                elements_text += "Groups in this element:\n"
                for group in element.get("groups", []):
                    elements_text += f"- Group: {group.get('name', '')}{_rq(group)}\n"
                    elements_text += f"  Description: {group.get('description', '')}\n"
                    elements_text += "  Figures:\n"
                    for fig_file, fig_info in group.get("figures", {}).items():
                        elements_text += f"    - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"
                element_figs = element.get("figures", {})
                if element_figs:
                    elements_text += "Ungrouped figures in this element:\n"
                    for fig_file, fig_info in element_figs.items():
                        elements_text += f"  - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"
    else:
        for idx, element in enumerate(scaffold_data.get("elements", [])):
            element_name = element.get("name") or f"Element {element.get('number')}"
            if is_flow:
                elements_text += f"\n### Section {idx + 1}\n"
            else:
                elements_text += f"\n### Scaffold Element: {element_name}\n"
            elements_text += "Groups in this element:\n"
            for group in element.get("groups", []):
                elements_text += f"- Group: {group.get('name', '')}{_rq(group)}\n"
                elements_text += f"  Description: {group.get('description', '')}\n"
                elements_text += "  Figures:\n"
                for fig_file, fig_info in group.get("figures", {}).items():
                    elements_text += f"    - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"
            element_figs = element.get("figures", {})
            if element_figs:
                elements_text += "Ungrouped figures in this element:\n"
                for fig_file, fig_info in element_figs.items():
                    elements_text += f"  - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    extra_groups_text = ""
    if extra_groups:
        extra_groups_text += "\n### Additional Non-Scaffold Groups:\n"
        for group in extra_groups:
            extra_groups_text += f"- Group: {group.get('name', '')}{_rq(group)}\n"
            extra_groups_text += f"  Description: {group.get('description', '')}\n"
            extra_groups_text += "  Figures:\n"
            for fig_file, fig_info in group.get("figures", {}).items():
                extra_groups_text += f"    - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    extra_figs_text = ""
    if extra_figures:
        extra_figs_text += "\n### Additional Ungrouped Figures (Non-Scaffold):\n"
        for fig_file, fig_info in extra_figures.items():
            extra_figs_text += f"  - {fig_file}{_rq(fig_info)}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    rqs_block = ""
    if rq_aware:
        rqs_block = (
            _format_rqs_prompt_section(rqs_data)
            + "\nWrite the narrative so it answers these questions in the order the "
            "sequence implies. Keep the questions IMPLICIT — do not name them in prose. "
            "Emphasise figures the user has linked to each question. Trust the user's links.\n"
        )

    prompt = f"""
### Input
Scaffold structure (elements, groups, and figures):
{elements_text}
{extra_groups_text}
{extra_figs_text}

Sequence:
{sequence}
{rqs_block}
{_load_prompt('build_story_multi_scaffold.txt') if is_multi else (_load_prompt(STORY_SCAFFOLDS[story_structure_id]['filename']) if story_structure_id and story_structure_id in FLOW_SCAFFOLDS else _load_prompt('build_story_with_scaffolds.txt'))}
""".strip()

    try:
        client = _openai_client()
        return _run_completion(
            client,
            {
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "timeout": 60,
            },
            on_chunk=on_chunk,
        )
    except Exception as e:
        logger.error(f"Error building story with scaffolds: {e}")
        return f"Error building story with scaffolds: {e}"


def _collect_in_story_items(recommended_order: list[str], user) -> list[str]:
    """
    Map the ordered figure/note tokens to user-facing titles for the sequence
    bullets. Preserves the sequence order. Deduplicates.

    - Image tokens (filenames): resolved to `short_desc` or "Visual N".
    - Non-image tokens (e.g. "Note 1"): used as-is — that's already the title
      the workspace shows.
    - Groups aren't listed here on purpose; the sequence is figure-level, so
      one bullet per figure/note reads naturally.
    """
    ImageData = _get_model("api", "ImageData")
    titles: list[str] = []
    seen: set[str] = set()
    for token in recommended_order:
        # `recommended_order` stores tokens as "[FIGURE: filename.png]" (see
        # extract_figure_filenames); strip that wrapper before matching against
        # ImageData.filepath, otherwise the lookup never hits and we'd fall back
        # to displaying the raw hex-string filename as the bullet label.
        clean = _normalize_figure_token(token).strip()
        if not clean:
            continue
        img = ImageData.objects.filter(
            user=user, workspace=_active_ws(user), media__filepath=clean
        ).first()
        if img and img.short_desc:
            label = img.short_desc
        elif img:
            label = f"Visual {img.index + 1}"
        else:
            label = clean
        if label not in seen:
            titles.append(label)
            seen.add(label)
    return titles


def _generate_sequence_bullets(
    sequence: str,
    story_text: str,
    in_story_items: list[str],
    story_structure_id: str | None = None,
) -> list[dict]:
    """
    Dedicated LLM call producing the display-ready "Sequence Justification"
    bullet list for the Reasoning tab. One bullet per workspace item that
    made it into the story; ≤15 words per bullet explaining the item's role
    in the sequence.

    `in_story_items` is a list of user-facing titles (e.g. "Note 1",
    "Visual 3", "Group: Trends") — exactly the items the model may label.
    The JSON schema enums labels to this set so the model can't hallucinate
    an item that wasn't in the story.

    Returns [{"label": "...", "why": "..."}], empty list on failure.
    """
    if not in_story_items:
        return []

    structure_hint = (
        f"Narrative structure used: {story_structure_id}\n"
        if story_structure_id
        else ""
    )
    items_text = "\n".join(f"- {t}" for t in in_story_items)
    prompt = f"""
### Input
{structure_hint}The following narrative was generated for the user:

--- BEGIN STORY ---
{story_text}
--- END STORY ---

Internal ordering notes from the sequencing step (do not repeat verbatim):
{sequence}

Workspace items that made it into the story (label each bullet with exactly one of these):
{items_text}

### Task
Produce EXACTLY {len(in_story_items)} bullets — one per workspace item listed
above, no more, no less. Do not skip any item; every listed item must appear.
For each bullet:
- `label`: the item's title exactly as listed (must match one of the items above).
- `why`: 15 words MAX, briefly explaining why the item appears where it does
  in the sequence and how it supports the story.

Do NOT include filenames, [FIGURE: …] tokens, or numbered prefixes in `why`.
Do NOT invent items that aren't in the list. Preserve the order the items
appear in the sequence.

Respond ONLY with a JSON object:
{{"items": [{{"label": "<one of the items>", "why": "<≤15 words>"}}]}}
""".strip()

    try:
        client = _openai_client()
        schema = {
            "name": "sequence_bullets",
            "schema": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "label": {"type": "string", "enum": in_story_items},
                                "why": {"type": "string"},
                            },
                            "required": ["label", "why"],
                        },
                    },
                },
                "required": ["items"],
            },
            "strict": True,
        }
        resp = client.chat.completions.create(
            # gpt-4o-mini: schema-strict short strings, one per item. Mini handles
            # this class of task reliably at ~2-3x the speed of gpt-4o.
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            timeout=30,
            response_format={"type": "json_schema", "json_schema": schema},
        )
        content = (resp.choices[0].message.content or "").strip()
        parsed = _extract_json_object(content)
        if not isinstance(parsed, dict) or not isinstance(parsed.get("items"), list):
            return []
        valid = set(in_story_items)
        bullets: list[dict] = []
        seen_labels: set[str] = set()
        for item in parsed["items"]:
            if not isinstance(item, dict):
                continue
            label = item.get("label", "")
            why = item.get("why", "")
            if label not in valid or not isinstance(why, str) or label in seen_labels:
                continue
            # Defensive strips: remove any [FIGURE:] tokens and trim to 15 words.
            why_clean = re.sub(r"\[FIGURE:\s*[^\]]+\]", "", why).strip()
            words = why_clean.split()
            if len(words) > 15:
                why_clean = " ".join(words[:15]).rstrip(",.;:") + "…"
            bullets.append({"label": label, "why": why_clean})
            seen_labels.add(label)
        # Coverage safeguard: the LLM sometimes returns fewer bullets than
        # workspace items despite the prompt saying "one per item". Fill any
        # missing item with a neutral placeholder so nothing silently disappears.
        for missing in in_story_items:
            if missing in seen_labels:
                continue
            bullets.append({"label": missing, "why": "Referenced in the story."})
            seen_labels.add(missing)
        return bullets
    except Exception as e:
        logger.error(f"Error generating sequence bullets: {e}")
        return []


def _generate_rq_reasoning(
    rqs_data: list,
    story_text: str,
    sequence: str,
    story_structure_id: str | None = None,
) -> list[dict]:
    """
    After the story is built, ask the LLM to explain how each research question
    shaped it. Populates NarrativeCache.rq_reasoning and drives the frontend's
    Research Questions section under the reasoning tab.

    Returns [{"label": "Q1", "how_informed": "..."}]; empty list when there are
    no RQs. Failure returns an empty list rather than raising — the story is
    already saved by this point and shouldn't be blocked on this side call.
    """
    if not rqs_data:
        return []

    rqs_section = _format_rqs_prompt_section(rqs_data)
    labels = [rq.get("label", "") for rq in rqs_data if rq.get("label")]
    structure_hint = (
        f"Narrative structure used: {story_structure_id}\n"
        if story_structure_id
        else ""
    )

    prompt = f"""
### Input
{structure_hint}The following narrative was generated for the user:

--- BEGIN STORY ---
{story_text}
--- END STORY ---

Recommended figure sequence:
{sequence}
{rqs_section}
### Task
For each research question above, in 1-2 sentences, describe how it informed
the final story: which sections it drove, which figures it emphasised, or
which decisions it shaped. Be specific about the story's actual content, not
generic. If a question was linked to no cards or its influence is limited,
say so honestly.

Formatting rules for each answer:
- Write plain prose, no headings or labels.
- Do NOT begin the sentence with "Justification", "Answer", or the question label — the UI already shows the label.
- Do NOT include figure filenames or [FIGURE: ...] tokens. Refer to visuals by what they show, not by filename.

Respond ONLY with a JSON object:
{{
  "items": [
    {{ "label": "<Q1 | Q2 | ...>", "how_informed": "<1-2 sentences>" }}
  ]
}}
Return one item per research question, in order.
""".strip()

    try:
        client = _openai_client()
        schema = {
            "name": "rq_reasoning",
            "schema": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "label": {"type": "string", "enum": labels or [""]},
                                "how_informed": {"type": "string"},
                            },
                            "required": ["label", "how_informed"],
                        },
                    },
                },
                "required": ["items"],
            },
            "strict": True,
        }
        resp = client.chat.completions.create(
            # gpt-4o-mini: same structured-extraction pattern as sequence bullets —
            # short strings, one per RQ. Mini is reliable at this shape.
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            timeout=30,
            response_format={"type": "json_schema", "json_schema": schema},
        )
        content = (resp.choices[0].message.content or "").strip()
        parsed = _extract_json_object(content)
        if isinstance(parsed, dict) and isinstance(parsed.get("items"), list):
            # Only keep items whose labels correspond to real RQs to guard against drift.
            valid_labels = set(labels)
            return [
                {
                    "label": item.get("label", ""),
                    "how_informed": item.get("how_informed", ""),
                }
                for item in parsed["items"]
                if item.get("label") in valid_labels
            ]
        return []
    except Exception as e:
        logger.error(f"Error generating RQ reasoning: {e}")
        return []


def extract_figure_filenames(sequence_response: str) -> list[str]:
    """
    Extract figure filenames from a GPT sequence response.

    Supports lines like:
      - Step 1: **image-01.png**
      - 1) `plot.jpg`
      - * figure_3.jpeg
      - Step 2 - chart.tiff
      - Just scattered filenames in text

    Returns a list of unique filenames in the order they first appear.
    """
    if not sequence_response:
        return []

    text = sequence_response

    # Common image extensions (extend if you need to)
    exts = r"(?:png|jpg|jpeg|bmp|tiff|gif|webp)"
    # Filename (allow subdirs, hyphens, underscores, dots, spaces around)
    filename = rf"([A-Za-z0-9_\-./]+\.{exts})"

    # Patterns (ordered from most- to least-structured)
    patterns = [
        # "- Step 1: **file.png**" | "Step 1: `file.jpg`" | "Step 1 file.png"
        re.compile(
            rf"(?:^|\n)\s*(?:-|\*|\u2022)?\s*Step\s*\d+\s*[:\-]?\s*(?:\*\*|`|\"|')?\s*{filename}\s*(?:\*\*|`|\"|')?",
            re.IGNORECASE,
        ),
        # "1) file.png" | "1. file.png" | "- file.png" | "* file.png" | "• file.png"
        re.compile(
            rf"(?:^|\n)\s*(?:-|\*|\u2022|\d+[.)])\s*(?:\*\*|`|\"|')?\s*{filename}\s*(?:\*\*|`|\"|')?",
            re.IGNORECASE,
        ),
        # Fallback: any filename-looking token anywhere
        re.compile(rf"{filename}", re.IGNORECASE),
    ]

    found: list[str] = []
    seen = set()

    for pat in patterns:
        for m in pat.finditer(text):
            fname = m.group(1).strip()
            # normalize any accidental trailing punctuation around filenames
            fname = "[FIGURE:" + fname.rstrip(".,);:]").lstrip("([") + "]"
            if fname not in seen:
                seen.add(fname)
                found.append(fname)
        if found:
            # stop at the first pattern that yields results
            break

    return found


def _normalize_figure_token(token: str) -> str:
    """
    Normalize a figure token like '[FIGURE: filename.png]' back to 'filename.png'.
    """
    if not token:
        return ""
    token = token.strip()
    if token.startswith("[FIGURE:") and token.endswith("]"):
        return token[len("[FIGURE:") : -1]
    return token


def _ensure_all_figures_in_order(
    recommended_order: list[str], categories: list[dict]
) -> list[str]:
    """
    Ensure that every figure present in categories appears in the final recommended_order.

    - recommended_order: list of '[FIGURE: filename]' tokens parsed from the LLM sequence.
    - categories: list of {'filename': <filepath>, 'category': <str>} dicts that represent
      all figures participating in this narrative mode.
    """
    # Start with existing tokens and track which raw filenames are already present.
    final_order: list[str] = list(recommended_order)
    present: set[str] = {_normalize_figure_token(tok) for tok in recommended_order}

    for cat in categories:
        filename = (cat or {}).get("filename")
        if not filename:
            continue
        if filename in present:
            continue
        # Append any missing figure at the end, preserving its raw filename.
        final_order.append(f"[FIGURE:{filename}]")
        present.add(filename)

    return final_order


def _extract_json_object(text: str) -> dict | None:
    """Best-effort extraction of a top-level JSON object from model content.

    - Strips markdown code fences like ```json ... ``` or ``` ... ```
    - Attempts direct json.loads
    - Falls back to slicing from first '{' to last '}'
    """
    if not text:
        return None
    s = text.strip()
    # Strip fenced code blocks
    if s.startswith("```") and s.endswith("```"):
        # remove first and last fence lines
        lines = s.splitlines()
        if len(lines) >= 3:
            # drop opening (maybe ```json) and closing ```
            lines = lines[1:-1]
            s = "\n".join(lines).strip()
    # Try parse directly
    try:
        return json.loads(s)
    except Exception:
        pass
    # Fallback: slice between first '{' and last '}'
    try:
        start = s.find("{")
        end = s.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = s[start : end + 1]
            return json.loads(candidate)
    except Exception:
        return None
    return None


def _format_rq_labels(labels: list[str]) -> str:
    """Inline suffix marking which research questions a figure or group answers."""
    if not labels:
        return " [linked research questions: none]"
    return f" [answers: {', '.join(labels)}]"


def _load_rqs_for_prompts(user, storyboard_image_ids: set | None = None) -> dict:
    """
    Load and pre-shape research questions for any prompt-building path.

    Consumed by both the feedback pipeline and the story-generation pipeline so
    the two see identical RQ context (labels, link semantics, "not on the
    storyboard" flagging, coverage counts).

    Args:
        user: the workspace owner whose questions to load.
        storyboard_image_ids: optional set of image ids that are on the
            storyboard. When supplied, figures linked to an RQ that aren't
            on the storyboard get a "(not on the storyboard)" title suffix
            so the model can flag coverage gaps. When None, all links are
            treated equally (used when the caller doesn't care about board
            membership).

    Returns:
        {
            "rqs_data": [{ "label": "Q1", "text": str,
                           "linked_figures": [str], "linked_groups": [str] }, ...],
            "rq_labels_by_image": { image_id: ["Q1", "Q3"] },
            "rq_labels_by_group": { group_id: ["Q2"] },
            "counts": { "research_questions": int,
                        "unlinked_research_questions": int },
        }
    """
    ResearchQuestion = _get_model("api", "ResearchQuestion")
    rqs_qs = ResearchQuestion.objects.filter(
        user=user, workspace=_active_ws(user)
    ).prefetch_related("images", "groups")
    rq_labels_by_image: dict = {}
    rq_labels_by_group: dict = {}
    rqs_data: list[dict] = []
    # Enumerate matches the UI's Q1..Qn labelling, which the RQ panel and the
    # per-card badges both compute in creation order.
    for idx, rq in enumerate(rqs_qs):
        label = f"Q{idx + 1}"
        linked_figures = []
        for img in rq.images.all():
            rq_labels_by_image.setdefault(img.id, []).append(label)
            title = img.short_desc or f"Visual {img.index + 1}"
            if storyboard_image_ids is not None and img.id not in storyboard_image_ids:
                title += " (not on the storyboard)"
            linked_figures.append(title)
        linked_groups = []
        for grp in rq.groups.all():
            rq_labels_by_group.setdefault(grp.id, []).append(label)
            linked_groups.append(grp.name or "Untitled group")
        rqs_data.append(
            {
                "label": label,
                "text": rq.text or "",
                "linked_figures": linked_figures,
                "linked_groups": linked_groups,
            }
        )

    unlinked_rq_count = sum(
        1 for rq in rqs_data if not rq["linked_figures"] and not rq["linked_groups"]
    )

    return {
        "rqs_data": rqs_data,
        "rq_labels_by_image": rq_labels_by_image,
        "rq_labels_by_group": rq_labels_by_group,
        "counts": {
            "research_questions": len(rqs_data),
            "unlinked_research_questions": unlinked_rq_count,
        },
    }


def _format_rqs_prompt_section(rqs_data: list) -> str:
    """
    Render an `### Research Questions:` block for any prompt that wants it.

    Kept identical across pipelines so the model sees the same shape whether
    it's judging alignment (feedback) or using RQs as directive (story-gen).
    Returns an empty string when there are no RQs — callers can just concat.
    """
    if not rqs_data:
        return ""
    lines = ["\n### Research Questions:"]
    for rq in rqs_data:
        linked_groups = rq.get("linked_groups") or []
        linked_figures = rq.get("linked_figures") or []
        lines.append(f"\n{rq.get('label', 'Q')}: {rq.get('text', '')}")
        lines.append(
            f"  Linked groups: {', '.join(linked_groups) if linked_groups else 'none'}"
        )
        lines.append(
            f"  Linked figures: {', '.join(linked_figures) if linked_figures else 'none'}"
        )
    return "\n".join(lines) + "\n"


def _generate_feedback(
    groups_data: list, ungrouped_data: dict, counts: dict, rqs_data: list | None = None
) -> list[dict]:
    """
    Use OpenAI to generate structured feedback items for the storyboard context.

    Input shapes:
        groups_data: [{ "name": str, "description": str, "rq_labels": [str],
                        "figures": { filepath: {"description": str, "data_url": str|None, "rq_labels": [str]} } }, ...]
        ungrouped_data: { filepath: {"description": str, "data_url": str|None, "rq_labels": [str]} }
        counts: { groups, storyboard_images, nongrouped_images, research_questions, unlinked_research_questions }
        rqs_data: [{ "label": "RQ1", "text": str, "linked_figures": [str], "linked_groups": [str] }, ...]

    Returns: a list of up to 5 items with fields:
        [{ section: "missing_items"|"item_quality"|"grouping_quality"|"rq_alignment", title: str, text: str }]
    """
    # Format narrative-ready context strings
    groups_text = ""
    grouped_image_entries: list[tuple[str, str, str, str | None]] = []
    for group in groups_data:
        group_name = group.get("name", "")
        group_desc = group.get("description", "")
        groups_text += f"\n### Group: {group_name}{_format_rq_labels(group.get('rq_labels') or [])}\n"
        groups_text += f"Description: {group_desc}\n"
        groups_text += "Figures in this group:\n"
        for fig_file, fig_info in group.get("figures", {}).items():
            desc = fig_info.get("description", "")
            title = fig_info.get("title", fig_file)
            data_url = fig_info.get("data_url")
            groups_text += f"  - {title}{_format_rq_labels(fig_info.get('rq_labels') or [])}: {desc}\n"
            caption_desc = desc if len(desc) <= 280 else f"{desc[:277]}..."
            grouped_image_entries.append((group_name, title, caption_desc, data_url))

    ungrouped_text = "\n### Ungrouped Figures:\n"
    ungrouped_image_entries: list[tuple[str, str, str, str | None]] = []
    for fig_file, fig_info in ungrouped_data.items():
        desc = fig_info.get("description", "")
        title = fig_info.get("title", fig_file)
        data_url = fig_info.get("data_url")
        ungrouped_text += (
            f"  - {title}{_format_rq_labels(fig_info.get('rq_labels') or [])}: {desc}\n"
        )
        caption_desc = desc if len(desc) <= 280 else f"{desc[:277]}..."
        ungrouped_image_entries.append(("Ungrouped", title, caption_desc, data_url))

    # Research questions and what each one currently claims, so the model can judge both the
    # questions themselves and whether the links to them hold up.
    rqs_data = rqs_data or []
    if rqs_data:
        rqs_text = _format_rqs_prompt_section(rqs_data)
    else:
        rqs_text = "\n### Research Questions:\nThe user has not written any research questions yet.\n"

    counts_text = (
        f"Total groups: {counts.get('groups', 0)}\n"
        f"Storyboard images: {counts.get('storyboard_images', 0)}\n"
        f"Ungrouped images: {counts.get('nongrouped_images', 0)}\n"
        f"Research questions: {counts.get('research_questions', 0)}\n"
        f"Research questions with no linked cards: {counts.get('unlinked_research_questions', 0)}\n"
        f"Storyboard images linked to no research question: {counts.get('unlinked_images', 0)}\n"
    )

    prompt = f"""
### Input
Storyboard counts:
{counts_text}
{rqs_text}
{groups_text}
{ungrouped_text}

Attached images correspond to the figures listed above.

{_load_prompt('feedback_prompt.txt')}
""".strip()

    try:
        client = _openai_client()
        # Define a strict JSON schema for structured output
        schema = {
            "name": "feedback_items",
            "schema": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "items": {
                        "type": "array",
                        "minItems": 1,
                        "maxItems": 5,
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "section": {
                                    "type": "string",
                                    "enum": [
                                        "missing_items",
                                        "item_quality",
                                        "grouping_quality",
                                        "rq_alignment",
                                    ],
                                },
                                "title": {"type": "string"},
                                "text": {"type": "string"},
                            },
                            "required": ["section", "title", "text"],
                        },
                    }
                },
                "required": ["items"],
            },
            "strict": True,
        }

        message_content: list[dict[str, object]] = [{"type": "text", "text": prompt}]
        images_attached = 0

        for group_name, fig_file, desc, data_url in grouped_image_entries:
            if not data_url:
                continue
            if images_attached >= MAX_FEEDBACK_IMAGES:
                logger.info(
                    "Reached feedback image embedding limit; remaining group images skipped."
                )
                break
            caption = f"Group '{group_name}' figure '{fig_file}'. Description: {desc}"
            message_content.append({"type": "text", "text": caption})
            message_content.append(
                {"type": "image_url", "image_url": {"url": data_url}}
            )
            images_attached += 1

        if images_attached < MAX_FEEDBACK_IMAGES:
            for group_name, fig_file, desc, data_url in ungrouped_image_entries:
                if not data_url:
                    continue
                if images_attached >= MAX_FEEDBACK_IMAGES:
                    logger.info(
                        "Reached feedback image embedding limit; remaining ungrouped images skipped."
                    )
                    break
                caption = f"{group_name} figure '{fig_file}'. Description: {desc}"
                message_content.append({"type": "text", "text": caption})
                message_content.append(
                    {"type": "image_url", "image_url": {"url": data_url}}
                )
                images_attached += 1

        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": message_content},
            ],
            temperature=0.1,
            timeout=30,
            response_format={"type": "json_schema", "json_schema": schema},
        )
        parsed_obj = None
        # Prefer native parsed if SDK provides it
        try:
            parsed_obj = resp.choices[0].message.parsed
        except Exception:
            parsed_obj = None

        if not parsed_obj:
            content = (resp.choices[0].message.content or "").strip()
            parsed_obj = _extract_json_object(content)

        if isinstance(parsed_obj, dict) and isinstance(parsed_obj.get("items"), list):
            items = []
            for it in parsed_obj["items"]:
                if not isinstance(it, dict):
                    continue
                # Keep section if present; UI will ignore unknown keys
                title = str(it.get("title", "")).strip()
                text = str(it.get("text", "")).strip()
                section = it.get("section")
                if title and text:
                    item = {"title": title, "text": text}
                    if isinstance(section, str):
                        item["section"] = section
                    items.append(item)
            # Enforce max 5
            return items[:5] if items else []

        # Fallback: synthesize a single generic item from raw content
        fallback_text = (resp.choices[0].message.content or "").strip()
        return [{"title": "Feedback", "text": fallback_text}]
    except Exception as e:
        logger.error(f"Error generating feedback via OpenAI: {e}")
        return [{"title": "Error", "text": f"Error generating feedback: {e}"}]


@shared_task(bind=True)
def generate_feedback_task(
    self, user_id: str, storyboard_id: str | None = None
) -> list[dict]:
    """
    Generate lightweight feedback by inspecting the user's storyboard data.

    Counts:
      - total number of groups
      - number of storyboard images that are not in any group

    Returns a dict; the API layer adapts it to an array of items for the UI.
    Example:
      {
        "summary": "you have 2 groups and 5 nongrouped images.",
        "highlights": [],
        "suggestions": [],
        "meta": { "storyboard_id": "...", "counts": {"groups": 2, "nongrouped_images": 5, "storyboard_images": 7} }
      }
    """
    task_id = self.request.id
    TOTAL_STAGES = 2

    def _progress(stage, name, substage=None):
        update_progress(
            user_id, "feedback", task_id, stage, TOTAL_STAGES, name, substage
        )

    try:
        _progress(0, "Collating...")

        User = get_user_model()
        ImageData = _get_model("api", "ImageData")
        GroupData = _get_model("api", "GroupData")

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return {
                "summary": "User not found.",
                "highlights": [],
                "suggestions": [],
                "meta": {"storyboard_id": storyboard_id, "error": "user_not_found"},
            }

        # Fetch storyboard images
        storyboard_images_qs = ImageData.objects.filter(
            user=user, workspace=_active_ws(user), in_storyboard=True
        ).select_related("media")
        storyboard_images_count = storyboard_images_qs.count()

        # Counts
        groups_qs = GroupData.objects.filter(
            user=user, workspace=_active_ws(user)
        ).prefetch_related("images")
        groups_count = groups_qs.count()
        nongrouped_count = storyboard_images_qs.filter(group_id__isnull=True).count()

        # Research questions in Q1..Qn order. Shared with the story pipeline via
        # _load_rqs_for_prompts so both surfaces see the same shape.
        storyboard_image_ids = set(storyboard_images_qs.values_list("id", flat=True))
        rq_ctx = _load_rqs_for_prompts(user, storyboard_image_ids=storyboard_image_ids)
        rqs_data = rq_ctx["rqs_data"]
        rq_labels_by_image = rq_ctx["rq_labels_by_image"]
        rq_labels_by_group = rq_ctx["rq_labels_by_group"]

        # A figure counts as covered if it is linked itself or sits in a linked group.
        unlinked_image_count = sum(
            1
            for img in storyboard_images_qs
            if not rq_labels_by_image.get(img.id)
            and not (img.group_id_id and rq_labels_by_group.get(img.group_id_id))
        )

        counts = {
            "groups": groups_count,
            "storyboard_images": storyboard_images_count,
            "nongrouped_images": nongrouped_count,
            "research_questions": rq_ctx["counts"]["research_questions"],
            "unlinked_research_questions": rq_ctx["counts"][
                "unlinked_research_questions"
            ],
            "unlinked_images": unlinked_image_count,
        }

        # Build groups data structure with descriptions
        groups_data = []
        for group in groups_qs:
            group_images = storyboard_images_qs.filter(group_id=group)
            if not group_images.exists():
                # still include empty groups for context
                groups_data.append(
                    {
                        "name": group.name,
                        "description": group.description or "",
                        "rq_labels": rq_labels_by_group.get(group.id, []),
                        "figures": {},
                    }
                )
                continue

            figures = {}
            for img in group_images:
                desc = img.long_desc or ""
                title = img.short_desc or f"Visual {img.index + 1}"
                data_url = _image_to_data_url(img.filepath)
                figure_payload = {
                    "description": desc,
                    "title": title,
                    "rq_labels": rq_labels_by_image.get(img.id, []),
                }
                if data_url:
                    figure_payload["data_url"] = data_url
                figures[img.filepath] = figure_payload

            groups_data.append(
                {
                    "name": group.name,
                    "description": group.description or "",
                    "rq_labels": rq_labels_by_group.get(group.id, []),
                    "figures": figures,
                }
            )

        # Build ungrouped data
        ungrouped_images = storyboard_images_qs.filter(group_id__isnull=True)
        ungrouped_data = {}
        for img in ungrouped_images:
            desc = img.long_desc or ""
            title = img.short_desc or f"Visual {img.index + 1}"
            data_url = _image_to_data_url(img.filepath)
            payload = {
                "description": desc,
                "title": title,
                "rq_labels": rq_labels_by_image.get(img.id, []),
            }
            if data_url:
                payload["data_url"] = data_url
            ungrouped_data[img.filepath] = payload

        # If nothing to analyze, short-circuit
        if storyboard_images_count == 0:
            return [
                {
                    "section": "missing_items",
                    "title": "No storyboard images",
                    "text": "Add images to the storyboard to request AI feedback.",
                }
            ]

        _progress(1, "Analyzing...")
        # Call OpenAI to generate feedback
        items = _generate_feedback(groups_data, ungrouped_data, counts, rqs_data)
        # Ensure items have the minimal shape expected by the GET mapper
        safe_items = []
        for it in items[:5]:
            if isinstance(it, dict):
                t = str(it.get("title", "")).strip()
                x = str(it.get("text", "")).strip()
                if t and x:
                    safe = {"title": t, "text": x}
                    if isinstance(it.get("section"), str):
                        safe["section"] = it["section"]
                    safe_items.append(safe)
        if not safe_items:
            # Last resort: provide counts as a single item
            safe_items = [
                {
                    "title": "Storyboard summary",
                    "text": f"You have {groups_count} groups and {nongrouped_count} ungrouped images.",
                }
            ]
        _progress(TOTAL_STAGES, "Complete")
        return safe_items
    except Exception as e:
        logger.error(f"Error generating feedback for user {user_id}: {e}")
        if task_id:
            update_progress(
                user_id, "feedback", task_id, -1, TOTAL_STAGES, "Error", error=str(e)
            )
        return [{"title": "Error", "text": str(e)}]


@shared_task
def generate_description_task(image_id):
    ImageData = _get_model("api", "ImageData")  # <— late import
    try:
        image = ImageData.objects.select_related("media").get(id=image_id)
        image_path = os.path.join(os.getenv("DATA_PATH"), image.filepath)
        with open(image_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")

        prompt = _load_prompt("generate_description.txt")
        client = _openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.1,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                        },
                    ],
                }
            ],
            timeout=30,
        )
        result = resp.choices[0].message.content

        image.long_desc = result
        image.long_desc_generating = False
        image.save()
        return f"Successfully generated description for image {image_id}"
    except Exception as e:
        logger.error(f"Error generating description for image {image_id}: {e}")
        # Prevent permanent "generating" state on failures.
        try:
            ImageData.objects.filter(id=image_id).update(long_desc_generating=False)
        except Exception as reset_err:
            logger.error(
                f"Error clearing long_desc_generating for image {image_id}: {reset_err}"
            )
        return f"Error generating description for image {image_id}: {e}"


def _build_figure_dict(
    images_queryset, skip_missing_desc=True, rq_labels_by_image: dict | None = None
):
    """
    Build a dictionary of figures from an images queryset.

    Args:
        images_queryset: QuerySet of ImageData objects
        skip_missing_desc: If True, skip images without long_desc
        rq_labels_by_image: Optional {image_id: ["Q1", "Q3"]} map. When supplied,
            each figure gets an "rq_labels" list so downstream prompts can annotate
            them with [answers: Q1, Q3].

    Returns:
        Dict mapping filepath to {"description": str, "category": str, "rq_labels": list}
    """
    figures = {}
    for image in images_queryset:
        if image.source == "instructor":
            continue  # Skip instructor feedback notes from story generation
        if skip_missing_desc and not image.long_desc:
            logger.warning(
                f"[BUILD_FIGURES] Image {image.filepath or image.short_desc} has no long_desc, skipping"
            )
            continue
        # Notes use their title as key; images use filepath
        key = (
            image.filepath
            if image.filepath
            else (image.short_desc or f"Note {image.index + 1}")
        )
        category = _categorize_figure(image.long_desc)
        entry = {
            "description": image.long_desc,
            "category": category,
        }
        if rq_labels_by_image is not None:
            entry["rq_labels"] = rq_labels_by_image.get(image.id, [])
        figures[key] = entry
    return figures


def _build_group_structure(
    group,
    images_queryset,
    rq_labels_by_image: dict | None = None,
    rq_labels_by_group: dict | None = None,
):
    """
    Build a group structure with its figures.

    Args:
        group: GroupData instance
        images_queryset: QuerySet of ImageData objects (already filtered for this group)
        rq_labels_by_image: Optional map; forwarded to _build_figure_dict.
        rq_labels_by_group: Optional {group_id: ["Q1"]} map; when supplied, the
            group's own rq_labels are attached.

    Returns:
        Dict with "name", "description", "figures", "rq_labels"
    """
    # images_queryset is already filtered for this group, no need to filter again
    figures = _build_figure_dict(images_queryset, rq_labels_by_image=rq_labels_by_image)

    result = {
        "name": group.name or "",
        "description": group.description or "",
        "figures": figures,
    }
    if rq_labels_by_group is not None:
        result["rq_labels"] = rq_labels_by_group.get(group.id, [])
    return result


def _build_scaffold_data(
    scaffold,
    all_groups,
    all_images,
    story_structure_id: str | None = None,
    slot_order: list | None = None,
    rq_labels_by_image: dict | None = None,
    rq_labels_by_group: dict | None = None,
):
    """
    Build the scaffold_data structure with elements, groups, and figures.

    Args:
        scaffold: ScaffoldData instance
        all_groups: QuerySet of all GroupData for user
        all_images: QuerySet of all ImageData for user

    Returns:
        Dict with scaffold structure or None if scaffold is None
    """
    if not scaffold:
        return None

    # Attempt to resolve a stable story_structure_id for this scaffold.
    resolved_structure_id: str | None = None
    if story_structure_id and story_structure_id in STORY_SCAFFOLDS:
        resolved_structure_id = story_structure_id
    else:
        # Fallback: infer from scaffold.number
        for sid, info in STORY_SCAFFOLDS.items():
            if info.get("number") == scaffold.number:
                resolved_structure_id = sid
                break

    # Filter groups that belong to this scaffold
    scaffold_groups = all_groups.filter(scaffold_id=scaffold)
    # Filter images that directly belong to scaffold (ungrouped images)
    scaffold_images = all_images.filter(scaffold_id=scaffold)

    elements = []

    if not scaffold.valid_group_numbers:
        logger.warning("[BUILD_SCAFFOLD] Scaffold has no valid_group_numbers")
        return {
            "name": scaffold.name,
            "number": scaffold.number,
            "story_structure_id": resolved_structure_id or "",
            "description": scaffold.description or "",
            "elements": [],
        }

    # Process each element number — use slot_order if provided (for linear scaffold reordering)
    element_order = slot_order if slot_order else scaffold.valid_group_numbers
    for element_num in element_order:
        # Groups in this element
        element_groups = scaffold_groups.filter(scaffold_group_number=element_num)

        # Build groups list for this element
        element_groups_list = []
        for group in element_groups:
            # FIX: Images in groups are found by group_id only (like frontend does)
            # The group's scaffold_id determines scaffold membership, not the image's scaffold_id
            group_images = all_images.filter(group_id=group)
            element_groups_list.append(
                _build_group_structure(
                    group,
                    group_images,
                    rq_labels_by_image=rq_labels_by_image,
                    rq_labels_by_group=rq_labels_by_group,
                )
            )

        # Ungrouped images in this element (not in any group)
        # Image must be in scaffold, not in any group, AND have scaffold_group_number matching element_num
        element_ungrouped_images = scaffold_images.filter(
            group_id__isnull=True,
            scaffold_group_number=element_num,
        )
        element_figures = _build_figure_dict(
            element_ungrouped_images, rq_labels_by_image=rq_labels_by_image
        )

        # Resolve element metadata (stable id + human label)
        element_id = f"element_{element_num}"
        element_label = f"Element {element_num}"
        if resolved_structure_id:
            per_structure = SCAFFOLD_ELEMENT_LABELS.get(resolved_structure_id, {})
            if isinstance(per_structure, dict):
                meta = per_structure.get(element_num)
                if isinstance(meta, dict):
                    element_id = meta.get("id", element_id)
                    element_label = meta.get("label", element_label)

        elements.append(
            {
                "id": element_id,
                "name": element_label,
                "number": element_num,
                "groups": element_groups_list,
                "figures": element_figures,
            }
        )

    return {
        "name": scaffold.name,
        "number": scaffold.number,
        "story_structure_id": resolved_structure_id or "",
        "description": scaffold.description or "",
        "elements": elements,
    }


def _build_group_data(
    non_scaffold_groups,
    all_images,
    rq_labels_by_image: dict | None = None,
    rq_labels_by_group: dict | None = None,
):
    """
    Build the group_data structure for groups not in scaffolds.

    Args:
        non_scaffold_groups: QuerySet of GroupData not in scaffolds
        all_images: QuerySet of all ImageData for user
        rq_labels_by_image, rq_labels_by_group: forwarded to _build_group_structure

    Returns:
        List of group structures
    """

    groups_list = []
    for group in non_scaffold_groups:
        # Only get images that are also not in scaffolds
        group_images = all_images.filter(group_id=group, scaffold_id__isnull=True)
        groups_list.append(
            _build_group_structure(
                group,
                group_images,
                rq_labels_by_image=rq_labels_by_image,
                rq_labels_by_group=rq_labels_by_group,
            )
        )

    return groups_list


def _build_figure_data(ungrouped_images, rq_labels_by_image: dict | None = None):
    """
    Build the figure_data structure for images not in scaffolds or groups.

    Args:
        ungrouped_images: QuerySet of ImageData not in groups or scaffolds

    Returns:
        Dict mapping filepath to figure info
    """
    return _build_figure_dict(ungrouped_images, rq_labels_by_image=rq_labels_by_image)


def _fetch_all_storyboard_data(
    user, story_structure_id=None, slot_order=None, scaffold_id=None
):
    """
    Fetch and organize all storyboard data (scaffolds, groups, images).

    Args:
        user: User instance
        story_structure_id: Optional scaffold number to filter by

    Returns:
        Dict with scaffold_data, group_data, figure_data, rqs_data, rq_counts.
        Every figure/group inside those structures also carries an rq_labels list
        so downstream prompts can annotate them with [answers: Q1, Q3].
    """
    ImageData = _get_model("api", "ImageData")
    GroupData = _get_model("api", "GroupData")
    ScaffoldData = _get_model("api", "ScaffoldData")

    logger.info(
        f"[FETCH_DATA] Fetching storyboard data for user {user.id}, story_structure_id={story_structure_id}"
    )

    # Fetch all groups and images
    all_groups = GroupData.objects.filter(
        user=user, workspace=_active_ws(user)
    ).prefetch_related("images")
    all_images = ImageData.objects.filter(
        user=user, workspace=_active_ws(user), in_storyboard=True
    ).select_related("media")
    logger.info(
        f"[FETCH_DATA] Total: {all_groups.count()} groups, {all_images.count()} storyboard images"
    )

    # Load RQ context once and thread it through every builder below so figures and
    # groups carry their rq_labels. Storyboard image ids are passed so the loader can
    # flag links that point at cards the user left off the board.
    storyboard_image_ids = set(all_images.values_list("id", flat=True))
    rq_ctx = _load_rqs_for_prompts(user, storyboard_image_ids=storyboard_image_ids)
    rq_labels_by_image = rq_ctx["rq_labels_by_image"]
    rq_labels_by_group = rq_ctx["rq_labels_by_group"]

    # Initialize output
    output_json = {
        "scaffold_data": None,
        "group_data": [],
        "figure_data": {},
        "rqs_data": rq_ctx["rqs_data"],
        "rq_counts": rq_ctx["counts"],
    }

    # Determine scaffold mode: specific scaffold, multi-scaffold, or no scaffold
    if scaffold_id:
        # Specific scaffold requested
        try:
            scaffold = ScaffoldData.objects.get(id=scaffold_id, user=user)
            logger.info(
                f"[FETCH_DATA] Using specific scaffold: {scaffold.name} ({scaffold_id})"
            )
            if not story_structure_id:
                from .pydandtic import STORY_SCAFFOLDS as _SS

                for sid, info in _SS.items():
                    if info.get("number") == scaffold.number:
                        story_structure_id = sid
                        break
            output_json["scaffold_data"] = _build_scaffold_data(
                scaffold,
                all_groups,
                all_images,
                story_structure_id,
                slot_order,
                rq_labels_by_image=rq_labels_by_image,
                rq_labels_by_group=rq_labels_by_group,
            )
        except ScaffoldData.DoesNotExist:
            logger.warning(f"[FETCH_DATA] Scaffold {scaffold_id} not found")

    elif not story_structure_id:
        # All workspace — no specific structure type, fetch all scaffolds
        all_scaffolds = ScaffoldData.objects.filter(
            user=user, workspace=_active_ws(user)
        )
        scaffold_count = all_scaffolds.count()
        logger.info(f"[FETCH_DATA] All workspace mode: {scaffold_count} scaffold(s)")

        if scaffold_count == 1:
            # Single scaffold — use it directly
            scaffold = all_scaffolds.first()
            # Infer structure id
            for sid, info in STORY_SCAFFOLDS.items():
                if info.get("number") == scaffold.number:
                    story_structure_id = sid
                    break
            output_json["scaffold_data"] = _build_scaffold_data(
                scaffold,
                all_groups,
                all_images,
                story_structure_id,
                slot_order,
                rq_labels_by_image=rq_labels_by_image,
                rq_labels_by_group=rq_labels_by_group,
            )

        elif scaffold_count > 1:
            # Multi-scaffold — build combined structure
            scaffold_names = []
            scaffold_structure_ids = []
            combined_elements = []

            for s in all_scaffolds:
                # Infer structure id for this scaffold
                s_structure_id = None
                for sid, info in STORY_SCAFFOLDS.items():
                    if info.get("number") == s.number:
                        s_structure_id = sid
                        break

                scaffold_data = _build_scaffold_data(
                    s,
                    all_groups,
                    all_images,
                    s_structure_id,
                    rq_labels_by_image=rq_labels_by_image,
                    rq_labels_by_group=rq_labels_by_group,
                )
                if scaffold_data:
                    scaffold_names.append(scaffold_data.get("name", "Unknown"))
                    if s_structure_id:
                        scaffold_structure_ids.append(s_structure_id)
                    # Tag each element with its scaffold name for the prompt
                    for element in scaffold_data.get("elements", []):
                        element["_scaffold_name"] = scaffold_data.get("name", "")
                        combined_elements.append(element)

            output_json["scaffold_data"] = {
                "multi": True,
                "scaffold_names": scaffold_names,
                "scaffold_structure_ids": scaffold_structure_ids,
                "name": "Multiple Scaffolds",
                "number": 0,
                "story_structure_id": f"multi:{','.join(scaffold_structure_ids)}",
                "description": f"Combined narrative using: {', '.join(scaffold_names)}",
                "elements": combined_elements,
            }
            story_structure_id = f"multi:{','.join(scaffold_structure_ids)}"

    else:
        # Specific structure type — filter scaffolds by type
        scaffold_number = None
        scaffold_info = STORY_SCAFFOLDS.get(story_structure_id)
        if scaffold_info:
            scaffold_number = scaffold_info["number"]

        scaffolds_qs = (
            ScaffoldData.objects.filter(
                user=user, workspace=_active_ws(user), number=scaffold_number
            )
            if scaffold_number
            else ScaffoldData.objects.filter(user=user, workspace=_active_ws(user))
        )
        scaffold = scaffolds_qs.first()
        if scaffold:
            output_json["scaffold_data"] = _build_scaffold_data(
                scaffold,
                all_groups,
                all_images,
                story_structure_id,
                slot_order,
                rq_labels_by_image=rq_labels_by_image,
                rq_labels_by_group=rq_labels_by_group,
            )

    # Non-scaffold groups + ungrouped figures are only relevant to All-Workspace mode.
    # When the caller pinned a specific scaffold (via scaffold_id), including these would
    # leak every other workspace item into the story — matching a user report where
    # "generate from this scaffold" produced a story spanning the whole workspace.
    if not scaffold_id:
        non_scaffold_groups = all_groups.filter(scaffold_id__isnull=True)
        output_json["group_data"] = _build_group_data(
            non_scaffold_groups,
            all_images,
            rq_labels_by_image=rq_labels_by_image,
            rq_labels_by_group=rq_labels_by_group,
        )

        ungrouped_non_scaffold = all_images.filter(
            scaffold_id__isnull=True, group_id__isnull=True
        )
        output_json["figure_data"] = _build_figure_data(
            ungrouped_non_scaffold, rq_labels_by_image=rq_labels_by_image
        )

    # Validation summary
    total_scaffold_figures = 0
    if output_json["scaffold_data"]:
        for element in output_json["scaffold_data"]["elements"]:
            for group in element["groups"]:
                total_scaffold_figures += len(group["figures"])
            total_scaffold_figures += len(element["figures"])

    total_group_figures = sum(len(g["figures"]) for g in output_json["group_data"])
    total_figure_data = len(output_json["figure_data"])
    total_expected = all_images.exclude(long_desc__exact="").count()

    logger.info(f"[FETCH_DATA] SUMMARY:")
    logger.info(f"  Scaffold figures: {total_scaffold_figures}")
    logger.info(f"  Group figures (non-scaffold): {total_group_figures}")
    logger.info(f"  Ungrouped figures (non-scaffold): {total_figure_data}")
    logger.info(
        "  Total figures counted: %s (expected with descriptions: %s)",
        total_scaffold_figures + total_group_figures + total_figure_data,
        total_expected,
    )
    if (
        total_scaffold_figures + total_group_figures + total_figure_data
        != total_expected
    ):
        logger.warning(
            "[FETCH_DATA] MISMATCH between counted figures (%s) and expected with descriptions (%s)",
            total_scaffold_figures + total_group_figures + total_figure_data,
            total_expected,
        )

    return output_json


@shared_task(bind=True)
def generate_narrative_task(
    self,
    user_id,
    story_structure_id=None,
    use_groups=False,
    slot_order=None,
    scaffold_id=None,
):
    User = get_user_model()
    ImageData = _get_model("api", "ImageData")
    GroupData = _get_model("api", "GroupData")
    ScaffoldData = _get_model("api", "ScaffoldData")
    NarrativeCache = _get_model("api", "NarrativeCache")

    task_id = self.request.id
    TOTAL_STAGES = 8

    def _progress(stage, name, substage=None):
        update_progress(
            user_id, "narrative", task_id, stage, TOTAL_STAGES, name, substage
        )

    logger.info(f"Generating story with structure: {story_structure_id}")

    try:
        _progress(0, "Checking...")

        # Make sure all images in storyboard have a description
        user = User.objects.get(id=user_id)

        # Ensure all storyboard images have non-placeholder descriptions before generating.
        PLACEHOLDER = "Ask AI to create a description for this visual."

        storyboard_qs = ImageData.objects.filter(
            user=user, workspace=_active_ws(user), in_storyboard=True
        ).select_related("media")

        images_needing_desc = storyboard_qs.filter(media__isnull=False).filter(
            Q(long_desc__isnull=True)
            | Q(long_desc__exact="")
            | Q(long_desc__exact=PLACEHOLDER)
        )

        for image in images_needing_desc:
            if image.long_desc_generating:
                logger.info(
                    f"[NARRATIVE] Skipping {image.filepath} - description already generating"
                )
                continue

            logger.info(
                f"[NARRATIVE] Generating missing description for {image.filepath}"
            )
            image.long_desc_generating = True
            image.save(update_fields=["long_desc_generating"])

            # Run description generation synchronously (blocking)
            generate_description_task(image.id)

        # Wait for all descriptions to finish generating
        _progress(1, "Describing...")
        wait_timeout_seconds = 300
        poll_interval_seconds = 1
        wait_deadline = time.time() + wait_timeout_seconds

        while True:
            pending_desc_qs = storyboard_qs.filter(long_desc_generating=True).filter(
                Q(long_desc__isnull=True)
                | Q(long_desc__exact="")
                | Q(long_desc__exact=PLACEHOLDER)
            )
            pending_count = pending_desc_qs.count()

            if pending_count == 0:
                break

            total_needing = images_needing_desc.count()
            done_count = total_needing - pending_count
            _progress(1, "Describing...")

            if time.time() >= wait_deadline:
                pending_files = list(
                    pending_desc_qs.values_list("media__filepath", flat=True)[:5]
                )
                logger.warning(
                    "[NARRATIVE] Timeout waiting for %s description task(s) "
                    "to finish (including externally-started tasks). Sample: %s",
                    pending_count,
                    pending_files,
                )
                break

            time.sleep(poll_interval_seconds)

        _progress(2, "Categorizing...")

        # Recompute storyboard images to only include visuals with real descriptions.
        storyboard_images = storyboard_qs.exclude(
            Q(long_desc__isnull=True)
            | Q(long_desc__exact="")
            | Q(long_desc__exact=PLACEHOLDER)
        )

        if not storyboard_images.exists():
            return "No storyboard images with descriptions found."

        # Build a flat list of descriptions for structure resolution and theme
        flat_figures: dict[str, dict[str, str]] = {}
        all_descriptions: list[str] = []
        for image in storyboard_images:
            if image.source == "instructor":
                continue  # Skip instructor feedback notes
            if not image.long_desc:
                continue
            key = (
                image.filepath
                if image.filepath
                else (image.short_desc or f"Note {image.index + 1}")
            )
            category = _categorize_figure(image.long_desc)
            flat_figures[key] = {
                "description": image.long_desc,
                "category": category,
            }
            all_descriptions.append(f"{key}: {image.long_desc}")

        all_descriptions_text = "\n".join(all_descriptions)

        # Load research questions once for the whole pipeline so structure choice, theme,
        # sequencing, story building, and post-hoc rq_reasoning all see the same context.
        # `_fetch_all_storyboard_data` also runs its own loader to attach rq_labels onto
        # every figure/group — an extra query, but the two use sites want different shapes.
        storyboard_image_ids = set(storyboard_images.values_list("id", flat=True))
        rqs_data = _load_rqs_for_prompts(
            user, storyboard_image_ids=storyboard_image_ids
        )["rqs_data"]

        _progress(3, "Structuring...")
        # Structure resolution and Theme both only read the flat description text +
        # rqs_data, so they can run concurrently. Structure was the pacing item on the
        # pre-stream critical path; running Theme underneath it hides ~1.5s of latency.
        # For "All workspace" (no scaffold_id and no story_structure_id), structure is
        # deferred until after fetching (multi-scaffold detection). Theme still runs now.
        is_all_workspace = not scaffold_id and not (story_structure_id or "").strip()
        from concurrent.futures import ThreadPoolExecutor

        def _timed(label, fn, *args, **kwargs):
            _t0 = time.perf_counter()
            _out = fn(*args, **kwargs)
            logger.info(f"[TIMING] {label}: {time.perf_counter() - _t0:.2f}s")
            return _out

        _t_pre = time.perf_counter()
        with ThreadPoolExecutor(max_workers=2) as _pre_pool:
            _theme_future = _pre_pool.submit(
                _timed,
                "theme",
                _understand_theme_objective,
                all_descriptions_text,
                rqs_data,
            )
            _struct_future = (
                None
                if is_all_workspace
                else _pre_pool.submit(
                    _timed,
                    "structure",
                    _resolve_story_structure_id,
                    story_structure_id,
                    all_descriptions_text,
                    rqs_data,
                )
            )
            theme = _theme_future.result()
            if _struct_future is not None:
                story_structure_id = _struct_future.result()
        logger.info(
            f"[TIMING] structuring (parallel wall): {time.perf_counter() - _t_pre:.2f}s"
        )
        logger.info(
            f"Using story structure: {story_structure_id} (all_workspace={is_all_workspace})"
        )

        _progress(4, "Fetching...")
        # Fetch all storyboard data (scaffolds, groups, figures)
        storyboard_data = _fetch_all_storyboard_data(
            user, story_structure_id, slot_order, scaffold_id
        )

        # For All workspace with multi-scaffold, use the composite structure ID
        # For All workspace with single scaffold, resolve from what _fetch returned
        if is_all_workspace:
            scaffold_data_tmp = storyboard_data.get("scaffold_data")
            if scaffold_data_tmp and scaffold_data_tmp.get("multi"):
                story_structure_id = scaffold_data_tmp["story_structure_id"]
            elif scaffold_data_tmp and scaffold_data_tmp.get("story_structure_id"):
                story_structure_id = scaffold_data_tmp["story_structure_id"]
            else:
                story_structure_id = _resolve_story_structure_id(
                    None, all_descriptions_text
                )
        logger.info(
            f"[NARRATIVE] Storyboard data: {json.dumps(storyboard_data, indent=4)}"
        )

        scaffold_data = storyboard_data.get("scaffold_data")
        non_scaffold_groups = storyboard_data.get("group_data") or []
        non_scaffold_figures = storyboard_data.get("figure_data") or {}

        # Streaming: publish each chunk of the Compose LLM call to the user's
        # story-stream channel group. Any open WebSocket subscribers see the story
        # as it's written. All three branches share the same callback.
        def _publish_chunk(delta: str) -> None:
            _publish_story_stream_event(user_id, "chunk", delta=delta)

        # Branch based on presence of scaffold data first, then use_groups flag, to keep backwards compatibility.
        # Theme was computed in parallel with Structure resolution above, so we skip
        # the standalone Theming stage and go straight to Sequencing.
        if scaffold_data:
            _progress(6, "Sequencing...")
            sequence = _timed(
                "sequence (scaffold)",
                _sequence_figures_with_scaffolds,
                scaffold_data,
                non_scaffold_groups,
                non_scaffold_figures,
                theme,
                story_structure_id,
                rqs_data=rqs_data,
            )
            _progress(7, "Composing...")
            # Filter notes out of figures for story builder (no [FIGURE:] placeholders for notes)
            story_non_scaffold_groups = [
                {
                    **g,
                    "figures": {
                        k: v for k, v in g.get("figures", {}).items() if "." in k
                    },
                }
                for g in non_scaffold_groups
            ]
            story_non_scaffold_figures = {
                k: v for k, v in non_scaffold_figures.items() if "." in k
            }
            # Also filter notes from scaffold_data elements
            story_scaffold_data = dict(scaffold_data)
            story_scaffold_data["elements"] = []
            for element in scaffold_data.get("elements", []):
                new_element = dict(element)
                new_element["figures"] = {
                    k: v for k, v in element.get("figures", {}).items() if "." in k
                }
                new_element["groups"] = [
                    {
                        **g,
                        "figures": {
                            k: v for k, v in g.get("figures", {}).items() if "." in k
                        },
                    }
                    for g in element.get("groups", [])
                ]
                story_scaffold_data["elements"].append(new_element)
            _publish_story_stream_event(user_id, "start")
            story = _timed(
                "compose (scaffold)",
                _build_story_with_scaffolds,
                story_scaffold_data,
                story_non_scaffold_groups,
                story_non_scaffold_figures,
                sequence,
                story_structure_id,
                rqs_data=rqs_data,
                on_chunk=_publish_chunk,
            )
            _publish_story_stream_event(user_id, "end")
            recommended_order = extract_figure_filenames(sequence)

            # Build categories from scaffold elements + any non-scaffold groups/figures
            categories = []
            for element in scaffold_data.get("elements", []):
                for group in element.get("groups", []):
                    for fig_file, fig_info in group.get("figures", {}).items():
                        categories.append(
                            {
                                "filename": fig_file,
                                "category": fig_info.get("category", ""),
                            }
                        )
                for fig_file, fig_info in element.get("figures", {}).items():
                    categories.append(
                        {"filename": fig_file, "category": fig_info.get("category", "")}
                    )
            for group in non_scaffold_groups:
                for fig_file, fig_info in group.get("figures", {}).items():
                    categories.append(
                        {"filename": fig_file, "category": fig_info.get("category", "")}
                    )
            for fig_file, fig_info in non_scaffold_figures.items():
                categories.append(
                    {"filename": fig_file, "category": fig_info.get("category", "")}
                )

            # Ensure every figure in the scaffold + extra groups/figures is represented in order.
            recommended_order = _ensure_all_figures_in_order(
                recommended_order, categories
            )

            generation_mode = "scaffold"

        elif use_groups:
            # Group-aware narrative generation without scaffolds (existing behavior)
            groups = GroupData.objects.filter(
                user=user, workspace=_active_ws(user)
            ).prefetch_related("images")

            grouped_images = storyboard_images.filter(group_id__isnull=False)
            ungrouped_images = storyboard_images.filter(group_id__isnull=True)

            groups_data = []
            for group in groups:
                group_images = grouped_images.filter(group_id=group)
                if not group_images.exists():
                    continue

                group_figures = {}
                for image in group_images:
                    if image.source == "instructor":
                        continue
                    key = (
                        image.filepath
                        if image.filepath
                        else (image.short_desc or f"Note {image.index + 1}")
                    )
                    category = _categorize_figure(image.long_desc)
                    group_figures[key] = {
                        "description": image.long_desc,
                        "category": category,
                    }

                groups_data.append(
                    {
                        "name": group.name,
                        "description": group.description,
                        "figures": group_figures,
                    }
                )

            ungrouped_data = {}
            for image in ungrouped_images:
                if image.source == "instructor":
                    continue
                key = (
                    image.filepath
                    if image.filepath
                    else (image.short_desc or f"Note {image.index + 1}")
                )
                category = _categorize_figure(image.long_desc)
                ungrouped_data[key] = {
                    "description": image.long_desc,
                    "category": category,
                }

            _progress(6, "Sequencing...")
            sequence = _timed(
                "sequence (groups)",
                _sequence_figures_with_groups,
                groups_data,
                ungrouped_data,
                theme,
                story_structure_id,
                rqs_data=rqs_data,
            )
            _progress(7, "Composing...")
            # Filter notes out of figures for story builder
            story_groups_data = [
                {
                    **g,
                    "figures": {
                        k: v for k, v in g.get("figures", {}).items() if "." in k
                    },
                }
                for g in groups_data
            ]
            story_ungrouped_data = {k: v for k, v in ungrouped_data.items() if "." in k}
            _publish_story_stream_event(user_id, "start")
            story = _timed(
                "compose (groups)",
                _build_story_with_groups,
                story_groups_data,
                story_ungrouped_data,
                sequence,
                rqs_data=rqs_data,
                on_chunk=_publish_chunk,
            )
            _publish_story_stream_event(user_id, "end")
            recommended_order = extract_figure_filenames(sequence)

            categories = []
            for group in groups_data:
                for fig_file, fig_info in group["figures"].items():
                    categories.append(
                        {"filename": fig_file, "category": fig_info["category"]}
                    )
            for fig_file, fig_info in ungrouped_data.items():
                categories.append(
                    {"filename": fig_file, "category": fig_info["category"]}
                )

            # Ensure every grouped/ungrouped figure is represented in order.
            recommended_order = _ensure_all_figures_in_order(
                recommended_order, categories
            )

            generation_mode = "grouped"

        else:
            # Flat narrative generation (backward compatible)
            _progress(6, "Sequencing...")
            sequence = _timed(
                "sequence (flat)",
                _sequence_figures,
                flat_figures,
                theme,
                story_structure_id,
                rqs_data=rqs_data,
            )
            _progress(7, "Composing...")
            # Exclude notes (no file extension) from the story builder so AI doesn't generate [FIGURE:] for them
            story_figures = {k: v for k, v in flat_figures.items() if "." in k}
            _publish_story_stream_event(user_id, "start")
            story = _timed(
                "compose (flat)",
                _build_story,
                story_figures,
                sequence,
                rqs_data=rqs_data,
                on_chunk=_publish_chunk,
            )
            _publish_story_stream_event(user_id, "end")
            recommended_order = extract_figure_filenames(sequence)

            categories = [
                {"filename": fn, "category": info["category"]}
                for fn, info in flat_figures.items()
            ]

            # Ensure every flat figure is represented in order.
            recommended_order = _ensure_all_figures_in_order(
                recommended_order, categories
            )

            generation_mode = "flat"

        # Get display name from mapping for logging/caching
        if story_structure_id and story_structure_id.startswith("multi:"):
            scaffold_data_for_name = storyboard_data.get("scaffold_data")
            scaffold_names = (
                scaffold_data_for_name.get("scaffold_names", [])
                if scaffold_data_for_name
                else []
            )
            story_structure_name = (
                f"Multiple ({', '.join(scaffold_names)})"
                if scaffold_names
                else "Multiple Scaffolds"
            )
        else:
            structure_info = STORY_SCAFFOLDS.get(story_structure_id or "")
            story_structure_name = (
                structure_info.get("name")
                if structure_info and structure_info.get("name")
                else (story_structure_id or "default")
            )

        # Two-phase completion so the user's Story tab unfreezes as soon as Compose
        # finishes rather than waiting on the Reasoning-tab post-hoc calls:
        #   Phase 1: persist the narrative + everything Compose produced, then push
        #     'complete' over the WebSocket with the full Story payload. Client can
        #     swap the streamed preview for the image-inlined final render immediately.
        #   Phase 2: run the Reasoning-tab helpers in parallel, patch the cache with
        #     their output, then push 'reasoning' with just those two fields.
        # Reasoning tab starts empty and hydrates a second later — acceptable because
        # most users are staring at the Story tab, not the Reasoning tab.
        with transaction.atomic():
            cache, created = NarrativeCache.objects.get_or_create(
                user=user,
                defaults={
                    "story_structure_id": story_structure_id or "",
                    "narrative": story,
                    "order": recommended_order,
                    "theme": theme,
                    "categories": categories,
                    "sequence_justification": sequence,
                    "sequence_summary": [],
                    "rq_reasoning": "",
                },
            )
            if not created:
                cache.story_structure_id = story_structure_id or ""
                cache.narrative = story
                cache.order = recommended_order
                cache.theme = theme
                cache.categories = categories
                cache.sequence_justification = sequence
                cache.sequence_summary = []
                cache.rq_reasoning = ""
                cache.save()

        _publish_story_stream_event(
            user_id,
            "complete",
            story_structure_id=story_structure_id or "",
            narrative=story,
            recommended_order=recommended_order,
            categorize_figures_response=categories,
            theme_response=theme,
            sequence_response=sequence,
            sequence_summary=[],
            rq_reasoning="",
        )

        # Post-hoc: two focused LLM calls, one per Reasoning-tab section. Each returns
        # display-ready text so the tab isn't dumping any raw prompt output.
        # Fired in parallel — both take the finished story as input, neither depends
        # on the other. Celery uses the default prefork pool so ThreadPoolExecutor
        # inside the task is safe (no gevent/eventlet monkey-patching). Each function
        # already try/except's internally, so a failure in one doesn't affect the other.
        in_story_items = _collect_in_story_items(recommended_order, user)
        from concurrent.futures import ThreadPoolExecutor

        _t_post = time.perf_counter()
        with ThreadPoolExecutor(max_workers=2) as _post_pool:
            _bullets_future = _post_pool.submit(
                _timed,
                "post_hoc.bullets",
                _generate_sequence_bullets,
                sequence,
                story,
                in_story_items,
                story_structure_id,
            )
            _rq_future = _post_pool.submit(
                _timed,
                "post_hoc.rq_reasoning",
                _generate_rq_reasoning,
                rqs_data,
                story,
                sequence,
                story_structure_id,
            )
            sequence_summary = _bullets_future.result()
            rq_reasoning = _rq_future.result()
        logger.info(
            f"[TIMING] post_hoc (parallel wall): {time.perf_counter() - _t_post:.2f}s"
        )

        NarrativeCache.objects.filter(user=user).update(
            sequence_summary=sequence_summary,
            rq_reasoning=rq_reasoning,
        )

        _publish_story_stream_event(
            user_id,
            "reasoning",
            sequence_summary=sequence_summary,
            rq_reasoning=rq_reasoning,
        )

        # Mark progress complete AFTER reasoning is written
        _progress(TOTAL_STAGES, "Complete")

        logger.info(
            f"Successfully generated {generation_mode} narrative for user {user.username} using structure: {story_structure_name}"
        )
        return f"Successfully generated {generation_mode} narrative for user {user.username} using structure: {story_structure_name}"
    except User.DoesNotExist:
        logger.error(f"User with id {user_id} not found")
        if task_id:
            update_progress(
                user_id,
                "narrative",
                task_id,
                -1,
                TOTAL_STAGES,
                "Error",
                error=f"User with id {user_id} not found",
            )
        return f"User with id {user_id} not found"
    except Exception as e:
        logger.exception("Error generating narrative")
        if task_id:
            update_progress(
                user_id, "narrative", task_id, -1, TOTAL_STAGES, "Error", error=str(e)
            )
        raise


# ---------------------------------------------------------------------------
# Group with AI
# ---------------------------------------------------------------------------

PLACEHOLDER_DESC = "Ask AI to create a description for this visual."


def _ai_group_images(visuals: list[dict], max_groups: int) -> list[dict]:
    """
    Call GPT to cluster visuals into groups.

    Args:
        visuals: List of {"key": identifier, "description": text}
        max_groups: Maximum number of groups to create

    Returns:
        List of {"title": str, "description": str, "members": [key, ...]}
    """
    visuals_text = "\n".join(f"- {v['key']}: {v['description']}" for v in visuals)
    prompt_template = _load_prompt("group_with_ai.txt")
    prompt = prompt_template.replace("{max_groups}", str(max_groups)).replace(
        "{visuals_text}", visuals_text
    )

    client = _openai_client()
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant that returns only valid JSON.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
        timeout=30,
    )
    raw = resp.choices[0].message.content.strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

    groups = json.loads(raw)

    # Validate: every input key should appear exactly once
    input_keys = {v["key"] for v in visuals}
    seen = set()
    for group in groups:
        group["members"] = [m for m in group["members"] if m in input_keys]
        seen.update(group["members"])

    # Any missing keys get added to Miscellaneous
    missing = input_keys - seen
    if missing:
        misc = next((g for g in groups if g["title"] == "Miscellaneous"), None)
        if misc:
            misc["members"].extend(missing)
        else:
            groups.append(
                {
                    "title": "Miscellaneous",
                    "description": "Items that do not fit a single theme.",
                    "members": list(missing),
                }
            )

    # Remove empty groups
    groups = [g for g in groups if g["members"]]

    return groups


@shared_task(bind=True)
def group_with_ai_task(self, user_id, mode="ungrouped"):
    """
    AI-powered grouping of workspace visuals.

    Args:
        user_id: User ID
        mode: "all" (regroup everything non-scaffold) or "ungrouped" (only ungrouped)
    """
    import math

    User = get_user_model()
    ImageData = _get_model("api", "ImageData")
    GroupData = _get_model("api", "GroupData")

    task_id = self.request.id
    TOTAL_STAGES = 3

    def _progress(stage, name):
        update_progress(user_id, "grouping", task_id, stage, TOTAL_STAGES, name)

    try:
        _progress(0, "Preparing...")
        user = User.objects.get(id=user_id)

        # If "all" mode, delete existing non-scaffold groups first
        if mode == "all":
            non_scaffold_groups = GroupData.objects.filter(
                user=user, workspace=_active_ws(user), scaffold_id__isnull=True
            )
            count = non_scaffold_groups.count()
            # Clearing group_id on images happens via SET_NULL on delete
            non_scaffold_groups.delete()
            logger.info(
                f"[AI_GROUP] Deleted {count} non-scaffold groups for user {user.username}"
            )

        # Fetch eligible images
        base_qs = ImageData.objects.filter(
            user=user,
            workspace=_active_ws(user),
            in_storyboard=True,
            scaffold_id__isnull=True,
        ).select_related("media")

        if mode == "ungrouped":
            base_qs = base_qs.filter(group_id__isnull=True)

        eligible = []
        skipped_unannotated = 0
        total_considered = 0
        for img in base_qs:
            # Skip instructor feedback
            if img.source == "instructor":
                continue
            # Determine key and description
            is_note = not img.filepath
            if is_note:
                # Sticky note — skip empty ones
                text = (img.short_desc or "").strip()
                if not text:
                    continue
                key = img.short_desc[:80] or f"Note {img.index + 1}"
                description = img.long_desc or img.short_desc or ""
            else:
                key = img.filepath
                description = img.long_desc or ""

            total_considered += 1

            # Skip images without any description
            if not description or description == PLACEHOLDER_DESC:
                skipped_unannotated += 1
                continue

            eligible.append(
                {"key": key, "image_id": str(img.id), "description": description}
            )

        if len(eligible) == 0:
            _progress(-1, "Error")
            update_progress(
                user_id,
                "grouping",
                task_id,
                -1,
                TOTAL_STAGES,
                "Error",
                error="No annotated visuals found. Add images and annotate them first.",
            )
            return "No annotated visuals found."

        if len(eligible) == 1:
            _progress(-1, "Error")
            update_progress(
                user_id,
                "grouping",
                task_id,
                -1,
                TOTAL_STAGES,
                "Error",
                error="Too few visuals. Add more in order to group.",
            )
            return "Too few visuals."

        if skipped_unannotated > len(eligible):
            _progress(-1, "Error")
            update_progress(
                user_id,
                "grouping",
                task_id,
                -1,
                TOTAL_STAGES,
                "Error",
                error=f"{skipped_unannotated} of your {total_considered} visuals are not yet annotated. Annotate them first for better grouping results.",
            )
            return "Too many unannotated visuals."

        max_groups = math.ceil(len(eligible) / 2)
        logger.info(
            f"[AI_GROUP] {len(eligible)} eligible visuals, max {max_groups} groups"
        )

        _progress(1, "Analyzing...")
        proposed_groups = _ai_group_images(eligible, max_groups)
        logger.info(f"[AI_GROUP] GPT proposed {len(proposed_groups)} groups")

        _progress(2, "Grouping...")

        # Build lookup from key -> image id
        key_to_id = {v["key"]: v["image_id"] for v in eligible}

        created_groups = []
        with transaction.atomic():
            for i, pg in enumerate(proposed_groups):
                # Offset positions so groups don't stack
                offset_x = (i % 4) * 350
                offset_y = (i // 4) * 300
                group = GroupData.objects.create(
                    user=user,
                    workspace=_active_ws(user),
                    name=pg["title"][:100],
                    description=(
                        pg["description"][:500] if pg.get("description") else ""
                    ),
                    x=150.0 + offset_x + (i * 17 % 60),
                    y=150.0 + offset_y + (i * 31 % 50),
                )
                # Assign images to this group
                member_ids = [key_to_id[m] for m in pg["members"] if m in key_to_id]
                ImageData.objects.filter(id__in=member_ids).update(group_id=group)

                created_groups.append(
                    {
                        "id": str(group.id),
                        "name": group.name,
                        "member_count": len(member_ids),
                    }
                )

        _progress(TOTAL_STAGES, "Complete")
        logger.info(
            f"[AI_GROUP] Created {len(created_groups)} groups for user {user.username}"
        )
        return {
            "status": "success",
            "groups_created": len(created_groups),
            "groups": created_groups,
        }

    except User.DoesNotExist:
        logger.error(f"User with id {user_id} not found")
        update_progress(
            user_id,
            "grouping",
            task_id,
            -1,
            TOTAL_STAGES,
            "Error",
            error=f"User with id {user_id} not found",
        )
        return f"User with id {user_id} not found"
    except json.JSONDecodeError as e:
        logger.error(f"[AI_GROUP] Failed to parse GPT response: {e}")
        update_progress(
            user_id,
            "grouping",
            task_id,
            -1,
            TOTAL_STAGES,
            "Error",
            error="AI returned an invalid response. Please try again.",
        )
        return "Invalid AI response"
    except Exception as e:
        logger.exception("[AI_GROUP] Error grouping with AI")
        update_progress(
            user_id, "grouping", task_id, -1, TOTAL_STAGES, "Error", error=str(e)
        )
        raise
