/** Maps UI StoryData to NarrativeCache model fields for POST /narrative/cache/update/ */

export interface StoryDataForCache {
    story_structure_id?: string;
    narrative?: string;
    recommended_order?: string[];
    categorize_figures_response?: string | Array<{ filename: string; category: string }>;
    theme_response?: string;
    sequence_response?: string;
}

export interface NarrativeCachePayload {
    story_structure_id: string;
    narrative: string;
    order: string[];
    theme: string;
    categories: Array<{ filename: string; category: string }>;
    sequence_justification: string;
}

/**
 * DB stores categories as a list of { filename, category }.
 * GET /narrative/cache/ may stringify that into display lines.
 */
export function categoriesForNarrativeCacheSave(
    value: StoryDataForCache['categorize_figures_response']
): Array<{ filename: string; category: string }> {
    if (Array.isArray(value)) {
        return value
            .filter(
                (x): x is { filename: string; category: string } =>
                    Boolean(x) && typeof x === 'object' && 'filename' in x && 'category' in x
            )
            .map((x) => ({ filename: String(x.filename), category: String(x.category) }));
    }
    if (typeof value !== 'string' || !value.trim()) return [];
    const out: Array<{ filename: string; category: string }> = [];
    const re = /^\[FIGURE:\s*([^\]]+)\]\s*:\s*(.+)$/gim;
    let m: RegExpExecArray | null;
    while ((m = re.exec(value)) !== null) {
        out.push({ filename: m[1].trim(), category: m[2].trim() });
    }
    return out;
}

export function storyDataToNarrativeCachePayload(story: StoryDataForCache): NarrativeCachePayload {
    const order = story.recommended_order ?? [];
    return {
        story_structure_id: story.story_structure_id ?? '',
        narrative: story.narrative ?? '',
        order: order.map(String),
        theme: story.theme_response ?? '',
        categories: categoriesForNarrativeCacheSave(story.categorize_figures_response),
        sequence_justification: story.sequence_response ?? '',
    };
}
