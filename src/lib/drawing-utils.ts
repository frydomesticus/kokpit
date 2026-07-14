import { getStroke } from 'perfect-freehand';
import { type Stroke } from '../db';

export function distanceToSegment(
  px: number, py: number,
  vx: number, vy: number,
  wx: number, wy: number
): number {
  const l2 = Math.pow(vx - wx, 2) + Math.pow(vy - wy, 2);
  if (l2 === 0) return Math.sqrt(Math.pow(px - vx, 2) + Math.pow(py - vy, 2));
  let t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(
    Math.pow(px - (vx + t * (wx - vx)), 2) +
    Math.pow(py - (vy + t * (wy - vy)), 2)
  );
}

export function getSvgPathFromStroke(stroke: Stroke, width: number, height: number): Path2D | null {
  const points = stroke.points.map(pt => [pt[0] * width, pt[1] * height, pt[2]]);
  const options = stroke.tool === 'highlighter'
    ? { size: stroke.size, thinning: 0, streamline: 0.3 }
    : { size: stroke.size, thinning: 0.35, smoothing: 0.5, streamline: 0.25 };

  const outline = getStroke(points, options);
  if (outline.length === 0) return null;

  const path = new Path2D();
  path.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    path.lineTo(outline[i][0], outline[i][1]);
  }
  path.closePath();
  return path;
}

export function drawStrokeOnContext(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number
) {
  const path = getSvgPathFromStroke(stroke, width, height);
  if (!path) return;

  ctx.save();
  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#f6e05e'; // Highlighter: fixed translucent yellow
  } else {
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = stroke.color;
  }

  ctx.fill(path);
  ctx.restore();
}

export function hitTestStroke(
  nx: number,
  ny: number,
  stroke: Stroke,
  zoom: number
): boolean {
  if (stroke.points.length === 0) return false;
  // Scaled tolerance radius relative to stroke size & zoom
  const tolerance = (stroke.size * 2.5) / 1000 / zoom;
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const pt1 = stroke.points[i];
    const pt2 = stroke.points[i + 1];
    const d = distanceToSegment(nx, ny, pt1[0], pt1[1], pt2[0], pt2[1]);
    if (d < tolerance) {
      return true;
    }
  }
  return false;
}
