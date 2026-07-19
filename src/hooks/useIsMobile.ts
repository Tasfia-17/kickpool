import { useState, useEffect } from 'react';

export function useIsMobile() {
    // undefined means we are rendering on the server / initial hydration
    // this prevents hydration mismatches where the server renders one thing
    // and the client renders another immediately.
    const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        // Check if the window inner width is <= 639px (Tailwind's 'sm' breakpoint is 640px)
        const mql = window.matchMedia('(max-width: 639px)');

        // Set initial value immediately after hydration
        setIsMobile(mql.matches);

        const onChange = (e: MediaQueryListEvent) => {
            setIsMobile(e.matches);
        };

        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    return isMobile;
}
