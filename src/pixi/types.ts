// PixiJS 타일맵 타입 정의
// Gather Clone types.ts 기반, 에디터 타입 제거

export type TilePoint = `${number}, ${number}`;

export type Layer = 'floor' | 'above_floor' | 'object';

export type Point = {
  x: number;
  y: number;
};

export type Coordinate = [number, number];

export type AnimationState =
  | 'idle_down'
  | 'idle_up'
  | 'idle_left'
  | 'idle_right'
  | 'walk_down'
  | 'walk_up'
  | 'walk_left'
  | 'walk_right';

export type Direction = 'down' | 'up' | 'left' | 'right';
