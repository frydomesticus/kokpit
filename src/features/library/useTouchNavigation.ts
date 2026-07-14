import React, { useEffect, useRef } from 'react';

interface TouchNavProps {
  zoom: number;
  setZoom: (z: number) => void;
  translateX: number;
  setTranslateX: (tx: number | ((prev: number) => number)) => void;
  translateY: number;
  setTranslateY: (ty: number | ((prev: number) => number)) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export function useTouchNavigation(
  containerRef: React.RefObject<HTMLDivElement>,
  props: TouchNavProps
) {
  const activePointers = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const initialPinchDist = useRef<number | null>(null);
  const initialZoom = useRef<number>(1);
  const swipeStartRef = useRef<{ x: number; time: number } | null>(null);

  const { zoom, setZoom, setTranslateX, setTranslateY, onNextPage, onPrevPage } = props;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      // Swipe detection starts near edges (48px from viewport edge) or when fully zoomed out (<= 1.0)
      if (activePointers.current.size === 1) {
        const isNearLeft = e.clientX <= 48;
        const isNearRight = e.clientX >= window.innerWidth - 48;
        if (isNearLeft || isNearRight || zoom <= 1.05) {
          swipeStartRef.current = { x: e.clientX, time: Date.now() };
        }
      } else {
        swipeStartRef.current = null;
      }

      // Initial pinch state
      if (activePointers.current.size === 2) {
        const pts = Array.from(activePointers.current.values()) as { clientX: number; clientY: number }[];
        const dx = pts[0].clientX - pts[1].clientX;
        const dy = pts[0].clientY - pts[1].clientY;
        initialPinchDist.current = Math.sqrt(dx * dx + dy * dy);
        initialZoom.current = zoom;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      const prev = activePointers.current.get(e.pointerId);
      if (!prev) return;

      // Update pointer location
      activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      if (activePointers.current.size === 1) {
        // Panning page
        const dx = e.clientX - prev.clientX;
        const dy = e.clientY - prev.clientY;
        setTranslateX(x => x + dx);
        setTranslateY(y => y + dy);
      } else if (activePointers.current.size === 2 && initialPinchDist.current) {
        // Pinch zooming
        const pts = Array.from(activePointers.current.values()) as { clientX: number; clientY: number }[];
        const dx = pts[0].clientX - pts[1].clientX;
        const dy = pts[0].clientY - pts[1].clientY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);

        // Center point of pinch gesture
        const midX = (pts[0].clientX + pts[1].clientX) / 2;
        const midY = (pts[0].clientY + pts[1].clientY) / 2;

        const scale = currentDist / initialPinchDist.current;
        const nextZoom = Math.min(4.0, Math.max(0.5, initialZoom.current * scale));

        // Adjust translations so the pinch center remains stable
        const rect = el.getBoundingClientRect();
        const relativeX = midX - rect.left;
        const relativeY = midY - rect.top;

        setZoom(nextZoom);
        setTranslateX(x => x - (relativeX * (nextZoom / zoom - 1)));
        setTranslateY(y => y - (relativeY * (nextZoom / zoom - 1)));
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      activePointers.current.delete(e.pointerId);

      if (activePointers.current.size < 2) {
        initialPinchDist.current = null;
      }

      // Check swipe criteria on last pointer up
      if (activePointers.current.size === 0 && swipeStartRef.current) {
        const deltaX = e.clientX - swipeStartRef.current.x;
        const duration = Date.now() - swipeStartRef.current.time;

        if (duration < 300 && Math.abs(deltaX) > 80) {
          if (deltaX > 80) {
            onPrevPage();
          } else if (deltaX < -80) {
            onNextPage();
          }
        }
        swipeStartRef.current = null;
      }
    };

    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [containerRef, zoom, setZoom, setTranslateX, setTranslateY, onNextPage, onPrevPage]);
}
