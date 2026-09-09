import type { EditorConfig, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from 'lexical';
import type { JSX } from 'react';

import { $applyNodeReplacement, DecoratorNode } from 'lexical';

import { getImageUrl } from '@/utils/imageUtils';
import { useDataStoryLexicalEnv } from '@/components/dataStory/DataStoryLexicalEnv';

export type SerializedFigureNode = Spread<
    {
        filename: string;
    },
    SerializedLexicalNode
>;

function FigureBlock({ filename }: { filename: string }) {
    const { getCaption } = useDataStoryLexicalEnv();
    let imageUrl: string;
    try {
        imageUrl = getImageUrl(filename);
    } catch {
        imageUrl = '';
    }
    const caption = getCaption(filename);

    if (!imageUrl) {
        return (
            <span className="block my-6 text-sm text-grey-dark italic">
                [Image not available: {filename}]
            </span>
        );
    }

    return (
        <span className="block w-full" contentEditable={false}>
            <span className="flex flex-col items-center justify-center w-full h-[35dvh] mt-10 mb-4">
                <img
                    src={imageUrl}
                    alt={caption}
                    className="w-auto h-full object-contain rounded-md shadow-sm m-0 p-0"
                    draggable={false}
                />
                <span className="text-sm text-grey-dark mt-2 italic mb-8">{caption}</span>
            </span>
        </span>
    );
}

export class FigureNode extends DecoratorNode<JSX.Element> {
    __filename: string;

    static getType(): string {
        return 'data-story-figure';
    }

    static clone(node: FigureNode): FigureNode {
        return new FigureNode(node.__filename, node.__key);
    }

    constructor(filename: string, key?: NodeKey) {
        super(key);
        this.__filename = filename;
    }

    getFilename(): string {
        return this.__filename;
    }

    createDOM(config: EditorConfig): HTMLElement {
        const span = document.createElement('span');
        const theme = config.theme;
        if (theme?.['data-story-figure'] != null) {
            span.className = theme['data-story-figure'] as string;
        }
        return span;
    }

    updateDOM(): false {
        return false;
    }

    decorate(): JSX.Element {
        return <FigureBlock filename={this.__filename} />;
    }

    exportJSON(): SerializedFigureNode {
        return {
            ...super.exportJSON(),
            filename: this.__filename,
        };
    }

    static importJSON(serialized: SerializedFigureNode): FigureNode {
        return $createFigureNode(serialized.filename);
    }
}

export function $createFigureNode(filename: string): FigureNode {
    return $applyNodeReplacement(new FigureNode(filename));
}

export function $isFigureNode(node: LexicalNode | null | undefined): node is FigureNode {
    return node instanceof FigureNode;
}
