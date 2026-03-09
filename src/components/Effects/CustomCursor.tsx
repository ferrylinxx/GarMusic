import { useEffect, useRef, useState } from 'react';
import './CustomCursor.css';

const isInteractiveElement = (element: HTMLElement | null): boolean => {
    if (!element) return false;
    return Boolean(
        element.closest(
            'a, button, input, textarea, select, label, summary, [role="button"], [data-cursor="interactive"], .clickable'
        )
    );
};

const CustomCursor = () => {
    const shellRef = useRef<HTMLDivElement>(null);
    const coreRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isClicking, setIsClicking] = useState(false);

    useEffect(() => {
        if (window.matchMedia('(hover: none)').matches) return;

        const shell = shellRef.current;
        const core = coreRef.current;
        if (!shell || !core) return;

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let shellX = mouseX;
        let shellY = mouseY;
        let coreX = mouseX;
        let coreY = mouseY;
        let rafId = 0;

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };

        const handleMouseDown = () => setIsClicking(true);
        const handleMouseUp = () => setIsClicking(false);

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target instanceof HTMLElement ? e.target : null;
            setIsHovering(isInteractiveElement(target));
        };

        const animate = () => {
            shellX += (mouseX - shellX) * 0.16;
            shellY += (mouseY - shellY) * 0.16;
            coreX += (mouseX - coreX) * 0.34;
            coreY += (mouseY - coreY) * 0.34;

            shell.style.transform = `translate3d(${shellX}px, ${shellY}px, 0) translate(-8%, -2%)`;
            core.style.transform = `translate3d(${coreX}px, ${coreY}px, 0) translate(-50%, -50%)`;

            rafId = window.requestAnimationFrame(animate);
        };

        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mouseover', handleMouseOver);

        animate();

        return () => {
            window.cancelAnimationFrame(rafId);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mouseover', handleMouseOver);
        };
    }, []);

    return (
        <>
            <div
                ref={shellRef}
                className={`custom-cursor-liquid ${isHovering ? 'hovering' : ''} ${isClicking ? 'clicking' : ''}`}
            />
            <div
                ref={coreRef}
                className={`custom-cursor-core ${isHovering ? 'hovering' : ''} ${isClicking ? 'clicking' : ''}`}
            />
        </>
    );
};

export default CustomCursor;
