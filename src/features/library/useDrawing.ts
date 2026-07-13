import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../db';
import { distanceToSegment, drawStrokesOnCanvas, type Stroke } from '../../lib/drawing-utils';

export function useDrawing(bookId: string | undefined, currentPage: number, scale: number, inks: any) {
  const [drawingEnabled, setDrawingEnabled] = useState<boolean>(false);
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState<string>('#A8271F');
  const [penWidth, setPenWidth] = useState<number>(2);
  const [localStrokes, setLocalStrokes] = useState<Stroke[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);

  useEffect(() => {
    setLocalStrokes(inks?.strokes || []);
  }, [inks]);

  useEffect(() => {
    if (drawingCanvasRef.current && canvasSize.width > 0) {
      drawStrokesOnCanvas(drawingCanvasRef.current, localStrokes);
    }
  }, [localStrokes, canvasSize]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingEnabled) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    if (tool === 'eraser') {
      eraseAt(nx, ny);
      isDrawingRef.current = true;
    } else {
      isDrawingRef.current = true;
      const color = tool === 'highlighter' ? 'rgba(250, 204, 21, 0.4)' : penColor;
      const width = tool === 'highlighter' ? 20 * scale : penWidth * scale;
      const newStroke: Stroke = {
        id: crypto.randomUUID(),
        color,
        width,
        isHighlighter: tool === 'highlighter',
        points: [{ x: nx, y: ny }]
      };
      currentStrokeRef.current = newStroke;
      setLocalStrokes(prev => [...prev, newStroke]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    if (tool === 'eraser') {
      eraseAt(nx, ny);
    } else if (currentStrokeRef.current) {
      const strokeId = currentStrokeRef.current.id;
      const updatedPoints = [...currentStrokeRef.current.points, { x: nx, y: ny }];
      currentStrokeRef.current.points = updatedPoints;
      setLocalStrokes(prev => prev.map(s => (s.id === strokeId ? { ...s, points: updatedPoints } : s)));
    }
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = drawingCanvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);
    currentStrokeRef.current = null;

    if (bookId) {
      await db.inks.put({ bookId, sayfa: currentPage, strokes: localStrokes });
    }
  };

  const eraseAt = async (nx: number, ny: number) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const threshold = 18 / Math.max(rect.width, rect.height);
    let hit = false;
    const remainingStrokes = localStrokes.filter(stroke => {
      for (let i = 0; i < stroke.points.length - 1; i++) {
        const dist = distanceToSegment({ x: nx, y: ny }, stroke.points[i], stroke.points[i + 1]);
        if (dist < threshold) {
          hit = true;
          return false;
        }
      }
      return true;
    });

    if (hit) {
      setLocalStrokes(remainingStrokes);
      if (bookId) {
        await db.inks.put({ bookId, sayfa: currentPage, strokes: remainingStrokes });
      }
    }
  };

  const handleClearPage = async () => {
    if (confirm('Bu sayfadaki tüm çizim ve çözümleri temizlemek istediğinize emin misiniz?')) {
      setLocalStrokes([]);
      if (bookId) await db.inks.delete([bookId, currentPage]);
    }
  };

  return {
    drawingEnabled, setDrawingEnabled,
    tool, setTool,
    penColor, setPenColor,
    penWidth, setPenWidth,
    localStrokes, setLocalStrokes,
    canvasSize, setCanvasSize,
    drawingCanvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleClearPage
  };
}
