import { useEffect, useState } from 'react';

/**
 * Reactively returns true whenever the guest tutorial has flagged this
 * `target` name to be force-open. The tutorial sets
 * `document.body.dataset.guestTourOpen = <name>` on screen change; dropdowns
 * use this hook to make themselves controlled-open during the corresponding
 * tour screen.
 */
export function useGuestTourOpen(target: string): boolean {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const check = () => {
            setOpen(document.body.getAttribute('data-guest-tour-open') === target);
        };
        check();
        const observer = new MutationObserver(check);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-guest-tour-open'],
        });
        return () => observer.disconnect();
    }, [target]);

    return open;
}
