export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  color: string;
  width: number;
  isHighlighter: boolean;
  points: StrokePoint[];
}

export function distanceToSegment(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number }
): number {
  const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
  if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(
    Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) +
    Math.pow(p.y - (v.y + t * (w.y - v.y)), 2)
  );
}

export function drawStrokesOnCanvas(
  canvas: HTMLCanvasElement,
  strokes: Stroke[]
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of strokes) {
    if (stroke.points.length < 1) continue;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const p0 = stroke.points[0];
    ctx.moveTo(p0.x * canvas.width, p0.y * canvas.height);
    for (let i = 1; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
    }
    ctx.stroke();
  }
}
