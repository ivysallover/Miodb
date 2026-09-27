import * as THREE from 'three';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

export function createCrossShape(w: number, len: number): THREE.Shape {
  const halfW = w / 2;
  const halfL = len / 2;
  const shape = new THREE.Shape();

  shape.moveTo(-halfW, halfL);
  shape.lineTo(halfW, halfL);
  shape.lineTo(halfW, halfW);
  shape.lineTo(halfL, halfW);
  shape.lineTo(halfL, -halfW);
  shape.lineTo(halfW, -halfW);
  shape.lineTo(halfW, -halfL);
  shape.lineTo(-halfW, -halfL);
  shape.lineTo(-halfW, -halfW);
  shape.lineTo(-halfL, -halfW);
  shape.lineTo(-halfL, halfW);
  shape.lineTo(-halfW, halfW);
  shape.closePath();

  return shape;
}
