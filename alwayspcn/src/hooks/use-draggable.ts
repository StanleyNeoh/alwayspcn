import { useRef, useState } from "react";

export function useDraggable(initial: { x: number; y: number }) {
  const [pos, setPos] = useState(initial);
  const isDragging = useRef(false);
  const startOffset = useRef({ x: 0, y: 0 });
  const posRef = useRef(initial);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    isDragging.current = true;
    startOffset.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging.current) return;
    const newPos = {
      x: e.clientX - startOffset.current.x,
      y: e.clientY - startOffset.current.y,
    };
    posRef.current = newPos;
    setPos(newPos);
  };

  const onPointerUp = () => {
    isDragging.current = false;
  };

  return {
    pos,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    } as React.HTMLAttributes<HTMLElement>,
  };
}
