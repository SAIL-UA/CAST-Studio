"""
Extract figure filenames / ids referenced in narrative text and cache payloads.
Matches [FIGURE: filename] tokens (same idea as ExportStoryView).
"""
from __future__ import annotations

import logging
import os
import re
from typing import Any, Iterable
from django.utils._os import safe_join

FIGURE_PATTERN = re.compile(
    r"\[\s*FIGURE\s*[:：﹕]\s*([^\]]+?)\s*\]",
    re.IGNORECASE | re.UNICODE,
)

logger = logging.getLogger(__name__)


def _sanitize_filename_token(raw: str) -> str:
    s = raw.strip()
    return re.sub(r"[^A-Za-z0-9._-]", "", s)


def extract_figure_filenames_from_text(text: str | None) -> set[str]:
    if not text or not isinstance(text, str):
        return set()
    out: set[str] = set()
    for m in FIGURE_PATTERN.finditer(text):
        cleaned = _sanitize_filename_token(m.group(1))
        if cleaned:
            out.add(cleaned)
    return out


def _order_entries_to_filenames(order: Any) -> set[str]:
    out: set[str] = set()
    if not order:
        return out
    if not isinstance(order, list):
        return out
    for item in order:
        if item is None:
            continue
        s = str(item).strip()
        if not s:
            continue
        m = FIGURE_PATTERN.search(s)
        if m:
            cleaned = _sanitize_filename_token(m.group(1))
            if cleaned:
                out.add(cleaned)
        else:
            cleaned = _sanitize_filename_token(s)
            if cleaned:
                out.add(cleaned)
    return out


def _categories_to_filenames(categories: Any) -> set[str]:
    out: set[str] = set()
    if not categories:
        return out
    if isinstance(categories, list):
        for item in categories:
            if isinstance(item, dict) and item.get("filename"):
                cleaned = _sanitize_filename_token(str(item["filename"]))
                if cleaned:
                    out.add(cleaned)
    elif isinstance(categories, str):
        out |= extract_figure_filenames_from_text(categories)
    return out


def referenced_filenames_from_narrative_cache_fields(
    *,
    narrative: str | None = None,
    theme: str | None = None,
    sequence_justification: str | None = None,
    order: Any = None,
    categories: Any = None,
) -> set[str]:
    refs: set[str] = set()
    for t in (narrative, theme, sequence_justification):
        refs |= extract_figure_filenames_from_text(t if isinstance(t, str) else None)
    refs |= _order_entries_to_filenames(order)
    refs |= _categories_to_filenames(categories)
    return refs


def image_matches_referenced(img_filepath: str, img_id: Any, referenced: Iterable[str]) -> bool:
    ref_set = set(referenced)
    fp = (img_filepath or "").strip()
    base = fp.rsplit(".", 1)[0] if fp else ""
    sid = str(img_id).strip() if img_id is not None else ""
    if fp and fp in ref_set:
        return True
    if base and base in ref_set:
        return True
    if sid and sid in ref_set:
        return True
    return False


def normalize_export_story_payload(raw: dict[str, Any]) -> dict[str, Any]:
    """
    Accept NarrativeCache-shaped JSON (theme, sequence_justification, order, categories)
    or legacy UI keys (theme_response, sequence_response, recommended_order, ...).
    Returns a dict with narrative, theme_response, sequence_response, etc. for PDF rendering.
    """
    theme_resp = raw["theme_response"] if "theme_response" in raw else raw.get("theme")
    seq_resp = (
        raw["sequence_response"] if "sequence_response" in raw else raw.get("sequence_justification")
    )
    order = raw["recommended_order"] if "recommended_order" in raw else raw.get("order")
    cats = (
        raw["categorize_figures_response"]
        if "categorize_figures_response" in raw
        else raw.get("categories")
    )
    return {
        "narrative": raw.get("narrative"),
        "theme_response": theme_resp,
        "sequence_response": seq_resp,
        "recommended_order": order,
        "categorize_figures_response": cats,
        "story_structure_id": raw.get("story_structure_id"),
    }


def referenced_filenames_from_export_payload(payload: dict[str, Any]) -> set[str]:
    """Accept cache-shaped or legacy export body; figure refs match ExportStoryView."""
    if not isinstance(payload, dict):
        return set()
    n = normalize_export_story_payload(payload)
    narrative = n.get("narrative")
    theme = n.get("theme_response")
    seq = n.get("sequence_response")
    return referenced_filenames_from_narrative_cache_fields(
        narrative=narrative if isinstance(narrative, str) else None,
        theme=theme if isinstance(theme, str) else None,
        sequence_justification=seq if isinstance(seq, str) else None,
        order=n.get("recommended_order"),
        categories=n.get("categorize_figures_response"),
    )


def export_story_payload_has_content(payload: dict[str, Any]) -> bool:
    if not isinstance(payload, dict):
        return False
    if str(payload.get("narrative") or "").strip():
        return True
    # NarrativeCache / updateNarrativeCache shape
    if str(payload.get("theme") or "").strip():
        return True
    if str(payload.get("sequence_justification") or "").strip():
        return True
    order = payload.get("order")
    if isinstance(order, list) and len(order) > 0:
        return True
    categories = payload.get("categories")
    if isinstance(categories, list) and len(categories) > 0:
        return True
    # Legacy export shape
    if str(payload.get("theme_response") or "").strip():
        return True
    if str(payload.get("sequence_response") or "").strip():
        return True
    ro = payload.get("recommended_order")
    if isinstance(ro, list) and len(ro) > 0:
        return True
    cf = payload.get("categorize_figures_response")
    if isinstance(cf, list) and len(cf) > 0:
        return True
    if isinstance(cf, str) and cf.strip():
        return True
    return False


def sync_in_output_flags_for_user(user) -> int:
    """
    Set ImageData.in_output True for figures referenced by the user's NarrativeCache, else False.
    Returns count of rows updated.
    """
    from .models import ImageData, NarrativeCache

    cache = NarrativeCache.objects.filter(user=user).first()
    if cache:
        refs = referenced_filenames_from_narrative_cache_fields(
            narrative=cache.narrative,
            theme=cache.theme,
            sequence_justification=cache.sequence_justification,
            order=cache.order,
            categories=cache.categories,
        )
    else:
        refs = set()

    updated = 0
    data_path = os.getenv("DATA_PATH")
    for img in ImageData.objects.filter(user=user):
        refd = image_matches_referenced(img.filepath, img.id, refs)
        if img.in_output != refd:
            ImageData.objects.filter(pk=img.pk).update(in_output=refd)
            updated += 1

        # Garbage collect physical image files that are no longer used anywhere
        # in the app state. Keep DB rows intact for audit/state continuity.
        if (
            not refd
            and not img.in_storyboard
            and not getattr(img, "in_trash", False)
            and img.group_id is None
            and img.scaffold_id is None
            and img.filepath
            and data_path
        ):
            try:
                file_path = safe_join(data_path, img.filepath)
            except ValueError:
                logger.warning("Skipping GC delete for invalid filepath: %s", img.filepath)
                continue

            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError as exc:
                    logger.warning(
                        "Failed to GC-delete file '%s' for image %s: %s",
                        file_path,
                        img.id,
                        exc,
                    )
    return updated
