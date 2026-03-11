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
    return OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def _get_model(app_label, model_name):
    # late-binding model lookup; safe before app registry 'ready'
    return apps.get_model(app_label, model_name)

@lru_cache(maxsize=None)
def _load_prompt(filename: str) -> str:
    """Lazy, cached prompt loader."""
    try:
        # Try project-relative prompts directory (backend/prompts/)
        prompts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prompts')
        prompt_path = os.path.join(prompts_dir, filename)
        if os.path.exists(prompt_path):
            with open(prompt_path, 'r') as f:
                return f.read().strip()

        # Fallback to BASE_DIR/backend/prompts (if BASE_DIR is set)
        base_dir = getattr(settings, 'BASE_DIR', '')
        fallback_dir = os.path.join(base_dir, 'backend', 'prompts')
        prompt_path = os.path.join(fallback_dir, filename)
        with open(prompt_path, 'r') as f:
            return f.read().strip()
    except Exception as e:
        logger.error(f"Error loading prompt {filename}: {e}")
        return f"Error loading prompt: {filename}"

@lru_cache(maxsize=256)
def _image_to_data_url(relative_path: str) -> str | None:
    """Convert an image on disk to a base64 data URL for OpenAI image inputs."""
    data_root = os.getenv('DATA_PATH')
    if not data_root:
        logger.warning("DATA_PATH is not configured; skipping image embedding for feedback.")
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
    """Categorize a single figure based on its description using OpenAI API."""
    prompt = f"""
### Input
This is a single figure description:
{description}

{_load_prompt('categorize_figures.txt')}
""".strip()

    try:
        client = _openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            timeout=30,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error categorizing figure: {e}")
        return f"Error categorizing figure: {e}"


def _understand_theme_objective(fig_descriptions: str) -> str:
    """Identify theme and objective based on all figure descriptions."""
    prompt = f"""
### Input
Descriptions of figures:
{fig_descriptions}

{_load_prompt('understand_theme_objective.txt')}
""".strip()

    try:
        client = _openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o",
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


def _choose_story_structure_id(all_descriptions_text: str) -> str:
    """
    Ask the LLM to choose the best story structure id for the given figures.

    The returned id will always be one of the keys in STORY_SCAFFOLDS.
    """
    # Build prompt using the shared story_definition reference
    story_definitions = _load_prompt("story_definition.txt")
    allowed_ids = list(STORY_SCAFFOLDS.keys())

    prompt = f"""
### Input
Descriptions of figures for this story:
{all_descriptions_text}

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

        resp = client.chat.completions.create(
            model="gpt-4o",
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


def _resolve_story_structure_id(story_structure_id: str | None, all_descriptions_text: str) -> str:
    """
    Resolve the final story structure id used for generation.

    Keeps a valid caller-provided id, otherwise auto-selects one.
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

    chosen = _choose_story_structure_id(all_descriptions_text)
    if chosen in STORY_SCAFFOLDS:
        return chosen

    fallback_id = next(iter(STORY_SCAFFOLDS))
    logger.warning(
        "[NARRATIVE] Auto-selected invalid scaffold '%s'; falling back to '%s'.",
        chosen,
        fallback_id,
    )
    return fallback_id


def _sequence_figures(fig_descriptions_category: dict, theme: str, story_structure_id: str) -> str:
    """Generate a recommended figure sequence given per-figure categories, theme, and the provided story structure."""
    base_prompt = f"""
### Input
Descriptions and categories of figures:
{fig_descriptions_category}

Topic theme and objective:
{theme}

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


def _build_story(fig_descriptions_category: dict, sequence: str) -> str:
    """Build a narrative using per-figure categories and the recommended sequence."""
    prompt = f"""
### Input
Descriptions and categories of figures:
{fig_descriptions_category}

Sequence:
{sequence}

{_load_prompt('build_story.txt')}
""".strip()

    try:
        client = _openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            timeout=30,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error building story: {e}")
        return f"Error building story: {e}"


def _sequence_figures_with_groups(groups_data: list, ungrouped_data: dict, theme: str, story_structure_id: str) -> str:
    """
    Sequence figures considering both groups and ungrouped figures.

    Args:
        groups_data: List of dicts with group info and figures
        ungrouped_data: Dict of ungrouped figures with descriptions/categories
        theme: Overall theme and objective
        story_structure_id: Story structure ID
    """
    # Format groups for the prompt
    groups_text = ""
    for group in groups_data:
        groups_text += f"\n### Group: {group['name']}\n"
        groups_text += f"Description: {group['description']}\n"
        groups_text += "Figures in this group:\n"
        for fig_file, fig_info in group['figures'].items():
            groups_text += f"  - {fig_file}: {fig_info['description']} (Category: {fig_info['category']})\n"

    # Format ungrouped figures
    ungrouped_text = "\n### Ungrouped Figures:\n"
    for fig_file, fig_info in ungrouped_data.items():
        ungrouped_text += f"  - {fig_file}: {fig_info['description']} (Category: {fig_info['category']})\n"

    base_prompt = f"""
### Input
{groups_text}
{ungrouped_text}

Topic theme and objective:
{theme}

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


def _build_story_with_groups(groups_data: list, ungrouped_data: dict, sequence: str) -> str:
    """
    Build a narrative that respects group structure and integrates ungrouped figures.

    Args:
        groups_data: List of dicts with group info and figures
        ungrouped_data: Dict of ungrouped figures with descriptions/categories
        sequence: Recommended sequence from sequencing step
    """
    # Format groups for the prompt
    groups_text = ""
    for group in groups_data:
        groups_text += f"\n### Group: {group['name']}\n"
        groups_text += f"Description: {group['description']}\n"
        groups_text += "Figures in this group:\n"
        for fig_file, fig_info in group['figures'].items():
            groups_text += f"  - {fig_file}: {fig_info['description']} (Category: {fig_info['category']})\n"

    # Format ungrouped figures
    ungrouped_text = "\n### Ungrouped Figures:\n"
    for fig_file, fig_info in ungrouped_data.items():
        ungrouped_text += f"  - {fig_file}: {fig_info['description']} (Category: {fig_info['category']})\n"

    prompt = f"""
### Input
{groups_text}
{ungrouped_text}

Sequence:
{sequence}

{_load_prompt('build_story_with_groups.txt')}
""".strip()

    try:
        client = _openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            timeout=30,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error building story with groups: {e}")
        return f"Error building story with groups: {e}"


def _sequence_figures_with_scaffolds(scaffold_data: dict, extra_groups: list, extra_figures: dict, theme: str, story_structure_id: str) -> str:
    """
    Sequence figures considering scaffold elements, their groups, and any extra non-scaffold groups/figures.

    Args:
        scaffold_data: Dict with scaffold structure as returned by _build_scaffold_data
        extra_groups: List of non-scaffold group dicts (same shape as _build_group_data output)
        extra_figures: Dict of non-scaffold, ungrouped figures
        theme: Overall theme and objective
        story_structure_id: Story structure ID
    """
    elements_text = ""
    for element in scaffold_data.get("elements", []):
        element_name = element.get("name") or f"Element {element.get('number')}"
        elements_text += f"\n### Scaffold Element: {element_name}\n"
        elements_text += "Groups in this element:\n"
        for group in element.get("groups", []):
            elements_text += f"- Group: {group.get('name', '')}\n"
            elements_text += f"  Description: {group.get('description', '')}\n"
            elements_text += "  Figures:\n"
            for fig_file, fig_info in group.get("figures", {}).items():
                elements_text += f"    - {fig_file}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"
        element_figs = element.get("figures", {})
        if element_figs:
            elements_text += "Ungrouped figures in this element:\n"
            for fig_file, fig_info in element_figs.items():
                elements_text += f"  - {fig_file}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    extra_groups_text = ""
    if extra_groups:
        extra_groups_text += "\n### Additional Non-Scaffold Groups:\n"
        for group in extra_groups:
            extra_groups_text += f"- Group: {group.get('name', '')}\n"
            extra_groups_text += f"  Description: {group.get('description', '')}\n"
            extra_groups_text += "  Figures:\n"
            for fig_file, fig_info in group.get("figures", {}).items():
                extra_groups_text += f"    - {fig_file}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    extra_figs_text = ""
    if extra_figures:
        extra_figs_text += "\n### Additional Ungrouped Figures (Non-Scaffold):\n"
        for fig_file, fig_info in extra_figures.items():
            extra_figs_text += f"  - {fig_file}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    base_prompt = f"""
### Input
Scaffold structure (elements, groups, and figures):
{elements_text}
{extra_groups_text}
{extra_figs_text}

Topic theme and objective:
{theme}

{_load_prompt('sequence_figures_with_scaffolds.txt')}
""".strip()

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


def _build_story_with_scaffolds(scaffold_data: dict, extra_groups: list, extra_figures: dict, sequence: str) -> str:
    """
    Build a narrative that explicitly reflects scaffold elements, their groups, and any extra groups/figures.

    Args:
        scaffold_data: Dict with scaffold structure as returned by _build_scaffold_data
        extra_groups: List of non-scaffold group dicts
        extra_figures: Dict of non-scaffold, ungrouped figures
        sequence: Recommended sequence from sequencing step
    """
    elements_text = ""
    for element in scaffold_data.get("elements", []):
        element_name = element.get("name") or f"Element {element.get('number')}"
        elements_text += f"\n### Scaffold Element: {element_name}\n"
        elements_text += "Groups in this element:\n"
        for group in element.get("groups", []):
            elements_text += f"- Group: {group.get('name', '')}\n"
            elements_text += f"  Description: {group.get('description', '')}\n"
            elements_text += "  Figures:\n"
            for fig_file, fig_info in group.get("figures", {}).items():
                elements_text += f"    - {fig_file}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"
        element_figs = element.get("figures", {})
        if element_figs:
            elements_text += "Ungrouped figures in this element:\n"
            for fig_file, fig_info in element_figs.items():
                elements_text += f"  - {fig_file}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    extra_groups_text = ""
    if extra_groups:
        extra_groups_text += "\n### Additional Non-Scaffold Groups:\n"
        for group in extra_groups:
            extra_groups_text += f"- Group: {group.get('name', '')}\n"
            extra_groups_text += f"  Description: {group.get('description', '')}\n"
            extra_groups_text += "  Figures:\n"
            for fig_file, fig_info in group.get("figures", {}).items():
                extra_groups_text += f"    - {fig_file}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    extra_figs_text = ""
    if extra_figures:
        extra_figs_text += "\n### Additional Ungrouped Figures (Non-Scaffold):\n"
        for fig_file, fig_info in extra_figures.items():
            extra_figs_text += f"  - {fig_file}: {fig_info.get('description', '')} (Category: {fig_info.get('category', '')})\n"

    prompt = f"""
### Input
Scaffold structure (elements, groups, and figures):
{elements_text}
{extra_groups_text}
{extra_figs_text}

Sequence:
{sequence}

{_load_prompt('build_story_with_scaffolds.txt')}
""".strip()

    try:
        client = _openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            timeout=30,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error building story with scaffolds: {e}")
        return f"Error building story with scaffolds: {e}"


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
        re.compile(rf"(?:^|\n)\s*(?:-|\*|\u2022)?\s*Step\s*\d+\s*[:\-]?\s*(?:\*\*|`|\"|')?\s*{filename}\s*(?:\*\*|`|\"|')?", re.IGNORECASE),

        # "1) file.png" | "1. file.png" | "- file.png" | "* file.png" | "• file.png"
        re.compile(rf"(?:^|\n)\s*(?:-|\*|\u2022|\d+[.)])\s*(?:\*\*|`|\"|')?\s*{filename}\s*(?:\*\*|`|\"|')?", re.IGNORECASE),

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
        start = s.find('{')
        end = s.rfind('}')
        if start != -1 and end != -1 and end > start:
            candidate = s[start:end+1]
            return json.loads(candidate)
    except Exception:
        return None
    return None


def _generate_feedback(groups_data: list, ungrouped_data: dict, counts: dict) -> list[dict]:
    """
    Use OpenAI to generate structured feedback items for the storyboard context.

    Input shapes:
        groups_data: [{ "name": str, "description": str, "figures": { filepath: {"description": str, "data_url": str|None} } }, ...]
        ungrouped_data: { filepath: {"description": str, "data_url": str|None} }
        counts: { groups, storyboard_images, nongrouped_images }

    Returns: a list of up to 4 items with fields:
        [{ section: "missing_items"|"item_quality"|"grouping_quality", title: str, text: str }]
    """
    # Format narrative-ready context strings
    groups_text = ""
    grouped_image_entries: list[tuple[str, str, str, str | None]] = []
    for group in groups_data:
        group_name = group.get('name', '')
        group_desc = group.get('description', '')
        groups_text += f"\n### Group: {group_name}\n"
        groups_text += f"Description: {group_desc}\n"
        groups_text += "Figures in this group:\n"
        for fig_file, fig_info in group.get('figures', {}).items():
            desc = fig_info.get('description', '')
            data_url = fig_info.get('data_url')
            groups_text += f"  - {fig_file}: {desc}\n"
            caption_desc = desc if len(desc) <= 280 else f"{desc[:277]}..."
            grouped_image_entries.append((group_name, fig_file, caption_desc, data_url))

    ungrouped_text = "\n### Ungrouped Figures:\n"
    ungrouped_image_entries: list[tuple[str, str, str, str | None]] = []
    for fig_file, fig_info in ungrouped_data.items():
        desc = fig_info.get('description', '')
        data_url = fig_info.get('data_url')
        ungrouped_text += f"  - {fig_file}: {desc}\n"
        caption_desc = desc if len(desc) <= 280 else f"{desc[:277]}..."
        ungrouped_image_entries.append(("Ungrouped", fig_file, caption_desc, data_url))

    counts_text = (
        f"Total groups: {counts.get('groups', 0)}\n"
        f"Storyboard images: {counts.get('storyboard_images', 0)}\n"
        f"Ungrouped images: {counts.get('nongrouped_images', 0)}\n"
    )

    prompt = f"""
### Input
Storyboard counts:
{counts_text}
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
                        "maxItems": 4,
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "section": {
                                    "type": "string",
                                    "enum": ["missing_items", "item_quality", "grouping_quality"]
                                },
                                "title": {"type": "string"},
                                "text": {"type": "string"}
                            },
                            "required": ["section", "title", "text"]
                        }
                    }
                },
                "required": ["items"]
            },
            "strict": True
        }

        message_content: list[dict[str, object]] = [{"type": "text", "text": prompt}]
        images_attached = 0

        for group_name, fig_file, desc, data_url in grouped_image_entries:
            if not data_url:
                continue
            if images_attached >= MAX_FEEDBACK_IMAGES:
                logger.info("Reached feedback image embedding limit; remaining group images skipped.")
                break
            caption = f"Group '{group_name}' figure '{fig_file}'. Description: {desc}"
            message_content.append({"type": "text", "text": caption})
            message_content.append({"type": "image_url", "image_url": {"url": data_url}})
            images_attached += 1

        if images_attached < MAX_FEEDBACK_IMAGES:
            for group_name, fig_file, desc, data_url in ungrouped_image_entries:
                if not data_url:
                    continue
                if images_attached >= MAX_FEEDBACK_IMAGES:
                    logger.info("Reached feedback image embedding limit; remaining ungrouped images skipped.")
                    break
                caption = f"{group_name} figure '{fig_file}'. Description: {desc}"
                message_content.append({"type": "text", "text": caption})
                message_content.append({"type": "image_url", "image_url": {"url": data_url}})
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
            # Enforce max 4
            return items[:4] if items else []

        # Fallback: synthesize a single generic item from raw content
        fallback_text = (resp.choices[0].message.content or "").strip()
        return [{"title": "Feedback", "text": fallback_text}]
    except Exception as e:
        logger.error(f"Error generating feedback via OpenAI: {e}")
        return [{"title": "Error", "text": f"Error generating feedback: {e}"}]


@shared_task
def generate_feedback_task(user_id: str, storyboard_id: str | None = None) -> list[dict]:
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
    try:
        User = get_user_model()
        ImageData = _get_model('api', 'ImageData')
        GroupData = _get_model('api', 'GroupData')

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
        storyboard_images_qs = ImageData.objects.filter(user=user, in_storyboard=True)
        storyboard_images_count = storyboard_images_qs.count()

        # Counts
        groups_qs = GroupData.objects.filter(user=user).prefetch_related('images')
        groups_count = groups_qs.count()
        nongrouped_count = storyboard_images_qs.filter(group_id__isnull=True).count()

        counts = {
            "groups": groups_count,
            "storyboard_images": storyboard_images_count,
            "nongrouped_images": nongrouped_count,
        }

        # Build groups data structure with descriptions
        groups_data = []
        for group in groups_qs:
            group_images = storyboard_images_qs.filter(group_id=group)
            if not group_images.exists():
                # still include empty groups for context
                groups_data.append({
                    "name": group.name,
                    "description": group.description or "",
                    "figures": {}
                })
                continue

            figures = {}
            for img in group_images:
                desc = img.long_desc or img.short_desc or ""
                data_url = _image_to_data_url(img.filepath)
                figure_payload = {"description": desc}
                if data_url:
                    figure_payload["data_url"] = data_url
                figures[img.filepath] = figure_payload

            groups_data.append({
                "name": group.name,
                "description": group.description or "",
                "figures": figures,
            })

        # Build ungrouped data
        ungrouped_images = storyboard_images_qs.filter(group_id__isnull=True)
        ungrouped_data = {}
        for img in ungrouped_images:
            desc = img.long_desc or img.short_desc or ""
            data_url = _image_to_data_url(img.filepath)
            payload = {"description": desc}
            if data_url:
                payload["data_url"] = data_url
            ungrouped_data[img.filepath] = payload

        # If nothing to analyze, short-circuit
        if storyboard_images_count == 0:
            return [{
                "section": "missing_items",
                "title": "No storyboard images",
                "text": "Add images to the storyboard to request AI feedback."
            }]

        # Call OpenAI to generate feedback
        items = _generate_feedback(groups_data, ungrouped_data, counts)
        # Ensure items have the minimal shape expected by the GET mapper
        safe_items = []
        for it in items[:4]:
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
            safe_items = [{
                "title": "Storyboard summary",
                "text": f"You have {groups_count} groups and {nongrouped_count} ungrouped images."
            }]
        return safe_items
    except Exception as e:
        logger.error(f"Error generating feedback for user {user_id}: {e}")
        return [{"title": "Error", "text": str(e)}]

@shared_task
def generate_description_task(image_id):
    ImageData = _get_model('api', 'ImageData')            # <— late import
    try:
        image = ImageData.objects.get(id=image_id)
        image_path = os.path.join(os.getenv('DATA_PATH'), image.filepath)
        with open(image_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")

        prompt = _load_prompt('generate_description.txt')
        client = _openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.1,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                ],
            }],
            timeout=30
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


def _build_figure_dict(images_queryset, skip_missing_desc=True):
    """
    Build a dictionary of figures from an images queryset.
    
    Args:
        images_queryset: QuerySet of ImageData objects
        skip_missing_desc: If True, skip images without long_desc
    
    Returns:
        Dict mapping filepath to {"description": str, "category": str}
    """
    figures = {}
    for image in images_queryset:
        if skip_missing_desc and not image.long_desc:
            logger.warning(f"[BUILD_FIGURES] Image {image.filepath} has no long_desc, skipping")
            continue
        category = _categorize_figure(image.long_desc)
        figures[image.filepath] = {
            "description": image.long_desc,
            "category": category
        }
    return figures


def _build_group_structure(group, images_queryset):
    """
    Build a group structure with its figures.
    
    Args:
        group: GroupData instance
        images_queryset: QuerySet of ImageData objects (already filtered for this group)
    
    Returns:
        Dict with "name", "description", "figures"
    """
    # images_queryset is already filtered for this group, no need to filter again
    figures = _build_figure_dict(images_queryset)
    
    return {
        "name": group.name or "",
        "description": group.description or "",
        "figures": figures
    }


def _build_scaffold_data(scaffold, all_groups, all_images, story_structure_id: str | None = None):
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

    # Process each element number
    for element_num in scaffold.valid_group_numbers:
        # Groups in this element
        element_groups = scaffold_groups.filter(scaffold_group_number=element_num)
        
        # Build groups list for this element
        element_groups_list = []
        for group in element_groups:
            # FIX: Images in groups are found by group_id only (like frontend does)
            # The group's scaffold_id determines scaffold membership, not the image's scaffold_id
            group_images = all_images.filter(group_id=group)
            element_groups_list.append(_build_group_structure(group, group_images))
        
        # Ungrouped images in this element (not in any group)
        # Image must be in scaffold, not in any group, AND have scaffold_group_number matching element_num
        element_ungrouped_images = scaffold_images.filter(
            group_id__isnull=True,
            scaffold_group_number=element_num,
        )
        element_figures = _build_figure_dict(element_ungrouped_images)

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


def _build_group_data(non_scaffold_groups, all_images):
    """
    Build the group_data structure for groups not in scaffolds.
    
    Args:
        non_scaffold_groups: QuerySet of GroupData not in scaffolds
        all_images: QuerySet of all ImageData for user
    
    Returns:
        List of group structures
    """
    
    groups_list = []
    for group in non_scaffold_groups:
        # Only get images that are also not in scaffolds
        group_images = all_images.filter(group_id=group, scaffold_id__isnull=True)
        groups_list.append(_build_group_structure(group, group_images))
    
    return groups_list


def _build_figure_data(ungrouped_images):
    """
    Build the figure_data structure for images not in scaffolds or groups.
    
    Args:
        ungrouped_images: QuerySet of ImageData not in groups or scaffolds
    
    Returns:
        Dict mapping filepath to figure info
    """
    return _build_figure_dict(ungrouped_images)


def _fetch_all_storyboard_data(user, story_structure_id=None):
    """
    Fetch and organize all storyboard data (scaffolds, groups, images).
    
    Args:
        user: User instance
        story_structure_id: Optional scaffold number to filter by
    
    Returns:
        Dict with scaffold_data, group_data, figure_data
    """
    ImageData = _get_model('api', 'ImageData')
    GroupData = _get_model('api', 'GroupData')
    ScaffoldData = _get_model('api', 'ScaffoldData')
    
    logger.info(f"[FETCH_DATA] Fetching storyboard data for user {user.id}, story_structure_id={story_structure_id}")
    
    # Initialize output
    output_json = {
        "scaffold_data": None,
        "group_data": [],
        "figure_data": {}
    }
    
    # Fetch scaffolds
    # Map story_structure_id (string like 'cause_and_effect') to its number before filtering
    scaffold_number = None
    if story_structure_id:
        scaffold_info = STORY_SCAFFOLDS.get(story_structure_id)
        if scaffold_info:
            scaffold_number = scaffold_info['number']
        else:
            logger.warning(f"[FETCH_DATA] Unknown story_structure_id '{story_structure_id}', filtering without number")
    
    logger.info(f"[SCAFFOLD_NUMBER]: {scaffold_number}")
    scaffolds = ScaffoldData.objects.filter(user=user, number=scaffold_number) if scaffold_number else ScaffoldData.objects.filter(user=user)
    scaffold_count = scaffolds.count()
    
    logger.info(f"[FETCH_DATA] Found {scaffold_count} scaffold(s)")
    
    if scaffold_count > 1:
        logger.warning(f"[FETCH_DATA] Multiple scaffolds found ({scaffold_count}), using first")
        output_json["error"] = f"Multiple scaffolds found ({scaffold_count})"
    
    scaffold = scaffolds.first() if scaffold_count > 0 else None
    
    # Fetch all groups and images
    all_groups = GroupData.objects.filter(user=user).prefetch_related('images')
    all_images = ImageData.objects.filter(user=user, in_storyboard=True)
    
    logger.info(f"[FETCH_DATA] Total: {all_groups.count()} groups, {all_images.count()} storyboard images")
    
    # Detailed breakdown for debugging
    # logger.info(f"[FETCH_DATA] Image breakdown:")
    # logger.info(f"  Total storyboard images: {all_images.count()}")
    # logger.info(f"  Images with scaffold_id: {all_images.filter(scaffold_id__isnull=False).count()}")
    # logger.info(f"  Images without scaffold_id: {all_images.filter(scaffold_id__isnull=True).count()}")
    # logger.info(f"  Images with group_id: {all_images.filter(group_id__isnull=False).count()}")
    # logger.info(f"  Images without group_id: {all_images.filter(group_id__isnull=True).count()}")
    # logger.info(f"  Images with long_desc: {all_images.exclude(long_desc__exact='').count()}")
    # logger.info(f"  Images without long_desc: {all_images.filter(long_desc__exact='').count()}")
    
    if scaffold:
        scaffold_images_all = all_images.filter(scaffold_id=scaffold)
        # logger.info(f"[FETCH_DATA] Scaffold '{scaffold.name}' image breakdown:")
        # logger.info(f"  Total images in scaffold: {scaffold_images_all.count()}")
        # logger.info(f"  Images in groups: {scaffold_images_all.filter(group_id__isnull=False).count()}")
        # logger.info(f"  Images not in groups: {scaffold_images_all.filter(group_id__isnull=True).count()}")
        for img in scaffold_images_all:
            pass
            # logger.info(f"    Image: {img.filepath}, group_id={img.group_id}, scaffold_group_number={img.scaffold_group_number}, has_long_desc={bool(img.long_desc)}")
    
    # Build scaffold_data if scaffold exists
    if scaffold:
        output_json["scaffold_data"] = _build_scaffold_data(scaffold, all_groups, all_images, story_structure_id)
        
        # Non-scaffold groups
        non_scaffold_groups = all_groups.filter(scaffold_id__isnull=True)
        output_json["group_data"] = _build_group_data(non_scaffold_groups, all_images)
        
        # Ungrouped, non-scaffold images
        ungrouped_non_scaffold = all_images.filter(
            scaffold_id__isnull=True,
            group_id__isnull=True
        )
        output_json["figure_data"] = _build_figure_data(ungrouped_non_scaffold)
    else:
        
        # All groups are non-scaffold
        output_json["group_data"] = _build_group_data(all_groups, all_images)
        
        # All ungrouped images
        ungrouped_images = all_images.filter(group_id__isnull=True)
        output_json["figure_data"] = _build_figure_data(ungrouped_images)
    
    # Validation summary
    total_scaffold_figures = 0
    if output_json["scaffold_data"]:
        for element in output_json["scaffold_data"]["elements"]:
            for group in element["groups"]:
                total_scaffold_figures += len(group["figures"])
            total_scaffold_figures += len(element["figures"])
    
    total_group_figures = sum(len(g["figures"]) for g in output_json["group_data"])
    total_figure_data = len(output_json["figure_data"])
    total_expected = all_images.exclude(long_desc__exact='').count()
    
    logger.info(f"[FETCH_DATA] SUMMARY:")
    logger.info(f"  Scaffold figures: {total_scaffold_figures}")
    logger.info(f"  Group figures (non-scaffold): {total_group_figures}")
    logger.info(f"  Ungrouped figures (non-scaffold): {total_figure_data}")
    logger.info(
        "  Total figures counted: %s (expected with descriptions: %s)",
        total_scaffold_figures + total_group_figures + total_figure_data,
        total_expected,
    )
    if total_scaffold_figures + total_group_figures + total_figure_data != total_expected:
        logger.warning(
            "[FETCH_DATA] MISMATCH between counted figures (%s) and expected with descriptions (%s)",
            total_scaffold_figures + total_group_figures + total_figure_data,
            total_expected,
        )
    
    return output_json


@shared_task
def generate_narrative_task(user_id, story_structure_id=None, use_groups=False):
    User = get_user_model()
    ImageData = _get_model('api', 'ImageData')
    GroupData = _get_model('api', 'GroupData')
    ScaffoldData = _get_model('api', 'ScaffoldData')
    NarrativeCache = _get_model('api', 'NarrativeCache')

    logger.info(f"Generating story with structure: {story_structure_id}")

    try:
        # Make sure all images in storyboard have a description
        user = User.objects.get(id=user_id)

        # Ensure all storyboard images have non-placeholder descriptions before generating.
        PLACEHOLDER = "Ask AI to create a description for this visual."

        storyboard_qs = ImageData.objects.filter(user=user, in_storyboard=True)

        images_needing_desc = storyboard_qs.filter(
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
        wait_timeout_seconds = 300
        poll_interval_seconds = 1
        wait_deadline = time.time() + wait_timeout_seconds

        while True:
            pending_desc_qs = storyboard_qs.filter(
                long_desc_generating=True
            ).filter(
                Q(long_desc__isnull=True)
                | Q(long_desc__exact="")
                | Q(long_desc__exact=PLACEHOLDER)
            )
            pending_count = pending_desc_qs.count()

            if pending_count == 0:
                break

            if time.time() >= wait_deadline:
                pending_files = list(
                    pending_desc_qs.values_list("filepath", flat=True)[:5]
                )
                logger.warning(
                    "[NARRATIVE] Timeout waiting for %s description task(s) "
                    "to finish (including externally-started tasks). Sample: %s",
                    pending_count,
                    pending_files,
                )
                break

            time.sleep(poll_interval_seconds)

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
            if not image.long_desc:
                continue
            category = _categorize_figure(image.long_desc)
            flat_figures[image.filepath] = {
                "description": image.long_desc,
                "category": category,
            }
            all_descriptions.append(f"{image.filepath}: {image.long_desc}")

        all_descriptions_text = "\n".join(all_descriptions)

        story_structure_id = _resolve_story_structure_id(
            story_structure_id,
            all_descriptions_text,
        )
        logger.info(f"Using story structure: {story_structure_id}")

        # Fetch all storyboard data (scaffolds, groups, figures) using the resolved structure id
        storyboard_data = _fetch_all_storyboard_data(user, story_structure_id)
        logger.info(f"[NARRATIVE] Storyboard data: {json.dumps(storyboard_data, indent=4)}")

        scaffold_data = storyboard_data.get("scaffold_data")
        non_scaffold_groups = storyboard_data.get("group_data") or []
        non_scaffold_figures = storyboard_data.get("figure_data") or {}

        # Branch based on presence of scaffold data first, then use_groups flag, to keep backwards compatibility.
        if scaffold_data:
            theme = _understand_theme_objective(all_descriptions_text)
            sequence = _sequence_figures_with_scaffolds(
                scaffold_data,
                non_scaffold_groups,
                non_scaffold_figures,
                theme,
                story_structure_id,
            )
            story = _build_story_with_scaffolds(
                scaffold_data,
                non_scaffold_groups,
                non_scaffold_figures,
                sequence,
            )
            recommended_order = extract_figure_filenames(sequence)

            # Build categories from scaffold elements + any non-scaffold groups/figures
            categories = []
            for element in scaffold_data.get("elements", []):
                for group in element.get("groups", []):
                    for fig_file, fig_info in group.get("figures", {}).items():
                        categories.append(
                            {"filename": fig_file, "category": fig_info.get("category", "")}
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

            generation_mode = "scaffold"

        elif use_groups:
            # Group-aware narrative generation without scaffolds (existing behavior)
            groups = GroupData.objects.filter(user=user).prefetch_related("images")

            grouped_images = storyboard_images.filter(group_id__isnull=False)
            ungrouped_images = storyboard_images.filter(group_id__isnull=True)

            groups_data = []
            for group in groups:
                group_images = grouped_images.filter(group_id=group)
                if not group_images.exists():
                    continue

                group_figures = {}
                for image in group_images:
                    category = _categorize_figure(image.long_desc)
                    group_figures[image.filepath] = {
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
                category = _categorize_figure(image.long_desc)
                ungrouped_data[image.filepath] = {
                    "description": image.long_desc,
                    "category": category,
                }

            all_descriptions_grouped = []
            for group in groups_data:
                for fig_file, fig_info in group["figures"].items():
                    all_descriptions_grouped.append(f"{fig_file}: {fig_info['description']}")
            for fig_file, fig_info in ungrouped_data.items():
                all_descriptions_grouped.append(f"{fig_file}: {fig_info['description']}")

            all_descriptions_grouped_text = "\n".join(all_descriptions_grouped)

            theme = _understand_theme_objective(all_descriptions_grouped_text)
            sequence = _sequence_figures_with_groups(
                groups_data, ungrouped_data, theme, story_structure_id
            )
            story = _build_story_with_groups(groups_data, ungrouped_data, sequence)
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

            generation_mode = "grouped"

        else:
            # Flat narrative generation (backward compatible)
            theme = _understand_theme_objective(all_descriptions_text)
            sequence = _sequence_figures(
                flat_figures,
                theme,
                story_structure_id,
            )
            story = _build_story(flat_figures, sequence)
            recommended_order = extract_figure_filenames(sequence)

            categories = [
                {"filename": fn, "category": info["category"]}
                for fn, info in flat_figures.items()
            ]

            generation_mode = "flat"

        # Get display name from mapping for logging/caching
        structure_info = STORY_SCAFFOLDS.get(story_structure_id or "")
        story_structure_name = (
            structure_info.get("name")
            if structure_info and structure_info.get("name")
            else (story_structure_id or "default")
        )

        with transaction.atomic():
            cache, created = NarrativeCache.objects.get_or_create(
                user=user,
                defaults={
                    'story_structure_id': story_structure_id or "",
                    'narrative': story,
                    'order': recommended_order,
                    'theme': theme,
                    'categories': categories,
                    'sequence_justification': sequence,
                }
            )
            if not created:
                cache.story_structure_id = story_structure_id or ""
                cache.narrative = story
                cache.order = recommended_order
                cache.theme = theme
                cache.categories = categories
                cache.sequence_justification = sequence
                cache.save()

        logger.info(f"Successfully generated {generation_mode} narrative for user {user.username} using structure: {story_structure_name}")
        return f"Successfully generated {generation_mode} narrative for user {user.username} using structure: {story_structure_name}"
    except User.DoesNotExist:
        logger.error(f"User with id {user_id} not found")
        return f"User with id {user_id} not found"
    except Exception:
        logger.exception("Error generating narrative")
        raise
