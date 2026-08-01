// Minimal allocation-friendly 2D vector ops (plain objects, pure functions).

export interface Vec2 {
  x: number;
  y: number;
}

export const v2 = (x: number, y: number): Vec2 => ({ x, y });
export const add2 = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub2 = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale2 = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot2 = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const mag2 = (a: Vec2): number => Math.hypot(a.x, a.y);
export const norm2 = (a: Vec2): Vec2 => {
  const m = mag2(a);
  return m === 0 ? { x: 0, y: 0 } : { x: a.x / m, y: a.y / m };
};
/** 2D cross product (z-component of the 3D cross). */
export const cross2 = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
/** Rotate a vector by angle (radians, counter-clockwise). */
export const rot2 = (a: Vec2, ang: number): Vec2 => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
};
