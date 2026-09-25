import type { TextMatchTransformer } from '@lexical/markdown';
import {
    CHECK_LIST,
    ELEMENT_TRANSFORMERS,
    LINK,
    MULTILINE_ELEMENT_TRANSFORMERS,
    TEXT_FORMAT_TRANSFORMERS,
    type Transformer,
} from '@lexical/markdown';
import type { LexicalNode, TextNode } from 'lexical';

import { $createFigureNode, $isFigureNode, FigureNode } from '@/components/dataStory/FigureNode';

/** Clean nested or messy `[FIGURE: ...]` capture groups (matches legacy processing). */
function cleanFigureFilename(raw: string): string {
    let f = raw.trim();
    f = f.replace(/^\[FIGURE:\s*/, '').replace(/\]$/, '');
    return f.trim();
}

export const FIGURE: TextMatchTransformer = {
    dependencies: [FigureNode],
    export: (node: LexicalNode) => {
        if (!$isFigureNode(node)) {
            return null;
        }
        return `[FIGURE: ${node.getFilename()}]`;
    },
    importRegExp: /\[FIGURE:\s*([^\]]+)\]/,
    regExp: /\[FIGURE:\s*([^\]]+)\]/,
    replace: (textNode: TextNode, match: RegExpMatchArray) => {
        const filename = cleanFigureFilename(match[1]);
        const figureNode = $createFigureNode(filename);
        textNode.replace(figureNode);
    },
    trigger: '[',
    type: 'text-match',
};

/**
 * Default Lexical markdown transformers plus figure placeholders and GFM-style task lists.
 * FIGURE is placed before LINK so `[FIGURE: …]` is not parsed as a link label.
 */
export const DATA_STORY_TRANSFORMERS: Transformer[] = [
    ...ELEMENT_TRANSFORMERS,
    CHECK_LIST,
    ...MULTILINE_ELEMENT_TRANSFORMERS,
    ...TEXT_FORMAT_TRANSFORMERS,
    FIGURE,
    LINK,
];
