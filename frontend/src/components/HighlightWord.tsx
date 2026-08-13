import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

// Ports Codrops' "hx-5" text highlight. By default fires on mount (for above-the-fold
// use). Pass `scrollTrigger` to gate until the element enters the viewport — appropriate
// for below-the-fold placements where you want users to catch the reveal.
export const HighlightWord = ({
    children,
    scrollTrigger = false,
}: {
    children: string;
    scrollTrigger?: boolean;
}) => {
    const ref = useRef<HTMLElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!scrollTrigger || !ref.current) return;
        const el = ref.current;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setVisible(true);
                        observer.disconnect(); // one-shot
                        break;
                    }
                }
            },
            { threshold: 0.3 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [scrollTrigger]);

    const cls = ['hx', 'hx-5'];
    if (scrollTrigger) cls.push('hx-5--gated');
    if (visible) cls.push('hx-5--play');

    return (
        <mark ref={ref} className={cls.join(' ')}>
            {Array.from(children).map((c, i) => (
                <span key={i} className="char" style={{ '--i': i } as CSSProperties}>
                    {c === ' ' ? ' ' : c}
                </span>
            ))}
        </mark>
    );
};

export default HighlightWord;
