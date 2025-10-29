# backend/api/tasks.py
from celery import shared_task
import os, base64, re, logging, json, mimetypes
from functools import lru_cache
from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from openai import OpenAI

logger = logging.getLogger(__name__)

# Guardrail against oversized payloads when attaching image data.
MAX_FEEDBACK_IMAGES = 12

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
def _image_to_data_url(username: str, relative_path: str) -> str | None:
    """Convert an image on disk to a base64 data URL for OpenAI image inputs."""
    data_root = os.getenv('DATA_PATH')
    if not data_root:
        logger.warning("DATA_PATH is not configured; skipping image embedding for feedback.")
        return None

    try:
        abs_path = os.path.abspath(os.path.join(data_root, username, "workspace", "cache", relative_path))
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


def _sequence_figures(fig_descriptions_category: dict, theme: str, story_structure_id: str = None) -> str:
    """Generate a recommended figure sequence given per-figure categories and the theme."""
    base_prompt = f"""
### Input
Descriptions and categories of figures:
{fig_descriptions_category}

Topic theme and objective:
{theme}

{_load_prompt('sequence_figures.txt')}
""".strip()

    # Add story structure guidance if provided
    if story_structure_id:
        story_structures = _load_prompt('story_definition.txt')
        structure_prompt = f"""

### Story Structure to Follow
Use the following narrative structure as guidance:
{story_structure_id}

Reference from available structures:
{story_structures}
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


def _sequence_figures_with_groups(groups_data: list, ungrouped_data: dict, theme: str, story_structure_id: str = None) -> str:
    """
    Sequence figures considering both groups and ungrouped figures.

    Args:
        groups_data: List of dicts with group info and figures
        ungrouped_data: Dict of ungrouped figures with descriptions/categories
        theme: Overall theme and objective
        story_structure_id: Optional story structure ID
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

    # Add story structure guidance if provided
    if story_structure_id:
        story_structures = _load_prompt('story_definition.txt')
        structure_prompt = f"""

### Story Structure to Follow
Use the following narrative structure as guidance:
{story_structure_id}

Reference from available structures:
{story_structures}
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
        Group = _get_model('api', 'Group')

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
        groups_qs = Group.objects.filter(user=user).prefetch_related('images')
        groups_count = groups_qs.count()
        nongrouped_count = storyboard_images_qs.filter(group__isnull=True).count()

        counts = {
            "groups": groups_count,
            "storyboard_images": storyboard_images_count,
            "nongrouped_images": nongrouped_count,
        }

        # Build groups data structure with descriptions
        groups_data = []
        for group in groups_qs:
            group_images = storyboard_images_qs.filter(group=group)
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
                data_url = _image_to_data_url(user.username, img.filepath)
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
        ungrouped_images = storyboard_images_qs.filter(group__isnull=True)
        ungrouped_data = {}
        for img in ungrouped_images:
            desc = img.long_desc or img.short_desc or ""
            data_url = _image_to_data_url(user.username, img.filepath)
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
        image_path = os.path.join(os.getenv('DATA_PATH'), image.user.username, "workspace", "cache", image.filepath)
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
        return f"Error generating description for image {image_id}: {e}"

@shared_task
def generate_narrative_task(user_id, story_structure_id=None, use_groups=False):
    User = get_user_model()
    ImageData = _get_model('api', 'ImageData')
    Group = _get_model('api', 'Group')
    NarrativeCache = _get_model('api', 'NarrativeCache')
    from django.db import transaction

    try:
        user = User.objects.get(id=user_id)
        storyboard_images = ImageData.objects.filter(user=user, in_storyboard=True).exclude(long_desc__exact="")
        if not storyboard_images.exists():
            return "No storyboard images with descriptions found."

        # Branch based on use_groups parameter
        if use_groups:
            # NEW: Group-aware narrative generation
            groups = Group.objects.filter(user=user).prefetch_related('images')

            # Separate grouped and ungrouped images
            grouped_images = storyboard_images.filter(group__isnull=False)
            ungrouped_images = storyboard_images.filter(group__isnull=True)

            # Build groups data structure
            groups_data = []
            for group in groups:
                group_images = grouped_images.filter(group=group)
                if not group_images.exists():
                    continue

                group_figures = {}
                for image in group_images:
                    category = _categorize_figure(image.long_desc)
                    group_figures[image.filepath] = {
                        "description": image.long_desc,
                        "category": category
                    }

                groups_data.append({
                    "name": group.name,
                    "description": group.description,
                    "figures": group_figures
                })

            # Build ungrouped data structure
            ungrouped_data = {}
            for image in ungrouped_images:
                category = _categorize_figure(image.long_desc)
                ungrouped_data[image.filepath] = {
                    "description": image.long_desc,
                    "category": category
                }

            # Combine all descriptions for theme
            all_descriptions = []
            for group in groups_data:
                for fig_file, fig_info in group['figures'].items():
                    all_descriptions.append(f"{fig_file}: {fig_info['description']}")
            for fig_file, fig_info in ungrouped_data.items():
                all_descriptions.append(f"{fig_file}: {fig_info['description']}")

            all_descriptions_text = "\n".join(all_descriptions)

            # Generate narrative with groups
            theme = _understand_theme_objective(all_descriptions_text)
            sequence = _sequence_figures_with_groups(groups_data, ungrouped_data, theme, story_structure_id)
            story = _build_story_with_groups(groups_data, ungrouped_data, sequence)
            recommended_order = extract_figure_filenames(sequence)

            # Build categories list for cache
            categories = []
            for group in groups_data:
                for fig_file, fig_info in group['figures'].items():
                    categories.append({"filename": fig_file, "category": fig_info['category']})
            for fig_file, fig_info in ungrouped_data.items():
                categories.append({"filename": fig_file, "category": fig_info['category']})

        else:
            # ORIGINAL: Flat narrative generation (backward compatible)
            fig_descriptions_category, all_descriptions = {}, []
            for image in storyboard_images:
                category = _categorize_figure(image.long_desc)
                fig_descriptions_category[image.filepath] = {"description": image.long_desc, "category": category}
                all_descriptions.append(f"{image.filepath}: {image.long_desc}")

            all_descriptions_text = "\n".join(all_descriptions)

            theme = _understand_theme_objective(all_descriptions_text)
            sequence = _sequence_figures(fig_descriptions_category, theme, story_structure_id)
            story = _build_story(fig_descriptions_category, sequence)
            recommended_order = extract_figure_filenames(sequence)

            categories = [
                {"filename": fn, "category": info["category"]}
                for fn, info in fig_descriptions_category.items()
            ]

        # Get story structure name for logging/caching
        story_structure_name = story_structure_id or "default"
        generation_mode = "grouped" if use_groups else "flat"

        with transaction.atomic():
            cache, created = NarrativeCache.objects.get_or_create(
                user=user,
                defaults={
                    'narrative': story,
                    'order': recommended_order,
                    'theme': theme,
                    'categories': categories,
                    'sequence_justification': sequence,
                }
            )
            if not created:
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
    except Exception as e:
        logger.error(f"Error generating narrative: {e}")
        return f"Error generating narrative: {e}"
