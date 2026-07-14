import React, { useState, useEffect, useRef } from 'react';
import { db, type Stroke } from '../../db';
import { drawStrokeOnContext, hitTestStroke } from '../../lib/drawing-utils';
import { newId } from '../../lib/id';

export interface DrawConfig {
  tool: 'pen' | 'highlighter' | 'eraser' | 'crop';
  color: string;
  size: number;
}

export function useDrawingState(bookId: string, page: number, zoom: number) {
  const [config, setConfig] = useState<DrawConfig>({
    tool: 'pen',
    color: '#e53e3e',
    size: 3
  });

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const undoStack = useRef<Stroke[][]>([]);
  const redoStack = useRef<Stroke[][]>([]);
  const isDrawingRef = useRef(false);
  const activeStrokeIdRef = useRef<string | null>(null);
  const currentPointsRef = useRef<[number, number, number][]>([]);
  
  const cropStartRef = useRef<{ x: number; y: number } | null>(null);
  const [activeCropRequest, setActiveCropRequest] = useState<{
    rect: [number, number, number, number];
    popoverPos: { x: number; y: number };
  } | null>(null);

  // Load configuration from settings table on mount
  useEffect(() => {
    async function loadConfig() {
      const persisted = await db.settings.get('drawingConfig');
      if (persisted?.value) {
        setConfig(persisted.value);
      }
    }
    loadConfig();
  }, []);

  // Save config on changes
  const updateConfig = async (newConfig: Partial<DrawConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    await db.settings.put({ key: 'drawingConfig', value: updated });
  };

  // Load strokes for current page
  useEffect(() => {
    async function loadStrokes() {
      const record = await db.inks.get([bookId, page]);
      const loaded = record?.strokes || [];
      setStrokes(loaded);
      undoStack.current = [];
      redoStack.current = [];
    }
    loadStrokes();
  }, [bookId, page]);

  const commitState = async (newStrokes: Stroke[]) => {
    // Keep max 50 entries in undo stack
    undoStack.current.push([...strokes]);
    if (undoStack.current.length > 50) {
      undoStack.current.shift();
    }
    redoStack.current = [];
    setStrokes(newStrokes);

    await db.inks.put({
      bookId,
      page,
      strokes: newStrokes,
      updated: new Date()
    });
  };

  const undo = async () => {
    if (undoStack.current.length === 0) return;
    const previous = undoStack.current.pop()!;
    redoStack.current.push([...strokes]);
    setStrokes(previous);
    await db.inks.put({
      bookId,
      page,
      strokes: previous,
      updated: new Date()
    });
  };

  const redo = async () => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push([...strokes]);
    setStrokes(next);
    await db.inks.put({
      bookId,
      page,
      strokes: next,
      updated: new Date()
    });
  };

  const clearPage = async () => {
    if (strokes.length === 0) return;
    await commitState([]);
  };

  // Pointer event drawing handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') return; // Palm rejection
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const pressure = e.pressure || 0.5;

    isDrawingRef.current = true;

    if (config.tool === 'eraser') {
      eraseAt(x, y);
    } else if (config.tool === 'crop') {
      cropStartRef.current = { x, y };
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      const strokeId = newId();
      activeStrokeIdRef.current = strokeId;
      currentPointsRef.current = [[x, y, pressure]];

      // Clear wet canvas and draw initial point
      const ctx = canvas.getContext('2d', { desynchronized: true });
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawStrokeOnContext(ctx, {
          id: strokeId,
          tool: config.tool === 'highlighter' ? 'highlighter' : 'pen',
          color: config.color,
          size: config.size,
          points: currentPointsRef.current
        }, canvas.width, canvas.height);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();

    if (config.tool === 'eraser') {
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      eraseAt(x, y);
    } else if (config.tool === 'crop') {
      const ctx = canvas.getContext('2d');
      if (ctx && cropStartRef.current) {
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        const px = cropStartRef.current.x * canvas.width;
        const py = cropStartRef.current.y * canvas.height;
        const pw = (x - cropStartRef.current.x) * canvas.width;
        const ph = (y - cropStartRef.current.y) * canvas.height;
        ctx.strokeRect(px, py, pw, ph);
        ctx.setLineDash([]);
      }
    } else {
      // Coalesced events tracking
      const events = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];
      const newPoints = events.map(evt => {
        const cx = (evt.clientX - rect.left) / rect.width;
        const cy = (evt.clientY - rect.top) / rect.height;
        return [cx, cy, evt.pressure || 0.5] as [number, number, number];
      });

      currentPointsRef.current.push(...newPoints);

      const ctx = canvas.getContext('2d', { desynchronized: true });
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawStrokeOnContext(ctx, {
          id: activeStrokeIdRef.current || '',
          tool: config.tool === 'highlighter' ? 'highlighter' : 'pen',
          color: config.color,
          size: config.size,
          points: currentPointsRef.current
        }, canvas.width, canvas.height);
      }
    }
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = e.currentTarget;
    canvas.releasePointerCapture(e.pointerId);

    if (config.tool === 'crop') {
      if (cropStartRef.current) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        const x1 = Math.min(cropStartRef.current.x, x);
        const y1 = Math.min(cropStartRef.current.y, y);
        const x2 = Math.max(cropStartRef.current.x, x);
        const y2 = Math.max(cropStartRef.current.y, y);
        const nw = x2 - x1;
        const nh = y2 - y1;

        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);

        if (nw > 0.02 && nh > 0.02) {
          setActiveCropRequest({
            rect: [x1, y1, nw, nh],
            popoverPos: { x: e.clientX, y: e.clientY }
          });
        }
      }
      cropStartRef.current = null;
    } else if (config.tool !== 'eraser' && activeStrokeIdRef.current) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      currentPointsRef.current.push([x, y, e.pressure || 0.5]);

      const newStroke: Stroke = {
        id: activeStrokeIdRef.current,
        tool: config.tool === 'highlighter' ? 'highlighter' : 'pen',
        color: config.color,
        size: config.size,
        points: currentPointsRef.current
      };

      await commitState([...strokes, newStroke]);
      activeStrokeIdRef.current = null;
      currentPointsRef.current = [];

      // Clear wet ink canvas
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    activeStrokeIdRef.current = null;
    currentPointsRef.current = [];
    cropStartRef.current = null;
    const canvas = e.currentTarget;
    canvas.releasePointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const eraseAt = async (x: number, y: number) => {
    const toRemove = new Set<string>();
    for (const s of strokes) {
      if (hitTestStroke(x, y, s, zoom)) {
        toRemove.add(s.id);
      }
    }
    if (toRemove.size > 0) {
      const filtered = strokes.filter(s => !toRemove.has(s.id));
      await commitState(filtered);
    }
  };

  return {
    config,
    updateConfig,
    strokes,
    undo,
    redo,
    clearPage,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    activeCropRequest,
    setActiveCropRequest,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel
    }
  };
}
