// 2D 타일맵 기반 오피스 맵 설정
// 직교 격자 (탑다운): 화면좌표 = tileX * TILE_SIZE, tileY * TILE_SIZE
// ZEP 스타일 참고: 바닥→벽→동선→가구→소품 순서

export const TILE_SIZE = 32;
export const MAP_COLS = 30;
export const MAP_ROWS = 22;

export type TileKey = `${number},${number}`;

export interface FurniturePlacement {
  sprite: string;
  tileX: number;
  tileY: number;
  scale?: number;
}

export interface RoomDef {
  id: string;
  label: string;
  tileX: number;
  tileY: number;
  width: number;
  height: number;
  floorColor: number;
  accentColor: number;
  furniture: FurniturePlacement[];
}

export interface AgentSpawn {
  roomId: string;
  tileX: number;
  tileY: number;
}

// ============================================================
// 맵 레이아웃 (30x22)
//
//  [로비/입구]  [  분석실  ] [  설계실  ] [  상황실  ]
//              ─────────── 복도 ───────────
//  [라운지  ]  [     회의실 (넓음)      ] [휴게공간]
//
// ============================================================

export const ROOMS: RoomDef[] = [
  // ─── 상단: 사무실 3개 (정갈하게, 벽면 활용) ───
  {
    id: 'analysis_lab',
    label: '분석실',
    tileX: 5, tileY: 1,
    width: 7, height: 6,
    floorColor: 0xDBEAFE,
    accentColor: 0x3B82F6,
    furniture: [
      // 좌측 벽면: 책장
      { sprite: 'DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png', tileX: 5, tileY: 1 },
      // 중앙: 데스크 + PC + 의자 (한 세트, 정렬)
      { sprite: 'DESK/DESK_FRONT.png', tileX: 7, tileY: 2 },
      { sprite: 'PC/PC_FRONT_ON_1.png', tileX: 7, tileY: 2, scale: 1.8 },
      { sprite: 'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png', tileX: 7, tileY: 3, scale: 1.5 },
      // 우측: 화분
      { sprite: 'PLANT/PLANT.png', tileX: 11, tileY: 5, scale: 1.5 },
    ],
  },
  {
    id: 'design_studio',
    label: '설계실',
    tileX: 13, tileY: 1,
    width: 7, height: 6,
    floorColor: 0xEDE9FE,
    accentColor: 0x8B5CF6,
    furniture: [
      // 데스크 + PC + 의자
      { sprite: 'DESK/DESK_FRONT.png', tileX: 15, tileY: 2 },
      { sprite: 'PC/PC_FRONT_ON_3.png', tileX: 15, tileY: 2, scale: 1.8 },
      { sprite: 'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png', tileX: 15, tileY: 3, scale: 1.5 },
      // 우측 벽면: 화이트보드
      { sprite: 'WHITEBOARD/WHITEBOARD.png', tileX: 19, tileY: 2, scale: 1.2 },
      // 좌측: 화분
      { sprite: 'PLANT_2/PLANT_2.png', tileX: 13, tileY: 5, scale: 1.5 },
    ],
  },
  {
    id: 'control_room',
    label: '상황실',
    tileX: 21, tileY: 1,
    width: 7, height: 6,
    floorColor: 0xD1FAE5,
    accentColor: 0x10B981,
    furniture: [
      // 데스크 + PC + 의자
      { sprite: 'DESK/DESK_FRONT.png', tileX: 23, tileY: 2 },
      { sprite: 'PC/PC_FRONT_ON_2.png', tileX: 23, tileY: 2, scale: 1.8 },
      { sprite: 'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png', tileX: 23, tileY: 3, scale: 1.5 },
      // 우측 벽면: 책장
      { sprite: 'BOOKSHELF/BOOKSHELF.png', tileX: 27, tileY: 1 },
      // 화분
      { sprite: 'LARGE_PLANT/LARGE_PLANT.png', tileX: 21, tileY: 5, scale: 1.2 },
    ],
  },

  // ─── 하단: 회의실 ───
  {
    id: 'meeting_hall',
    label: '회의실',
    tileX: 8, tileY: 12,
    width: 12, height: 7,
    floorColor: 0xFEF3C7,
    accentColor: 0xD97706,
    furniture: [
      // 중앙 테이블 + 양쪽 의자
      { sprite: 'TABLE_FRONT/TABLE_FRONT.png', tileX: 13, tileY: 14, scale: 2 },
      { sprite: 'WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png', tileX: 12, tileY: 16, scale: 1.5 },
      { sprite: 'WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png', tileX: 14, tileY: 16, scale: 1.5 },
      { sprite: 'WOODEN_CHAIR/WOODEN_CHAIR_BACK.png', tileX: 12, tileY: 13, scale: 1.5 },
      { sprite: 'WOODEN_CHAIR/WOODEN_CHAIR_BACK.png', tileX: 14, tileY: 13, scale: 1.5 },
      // 벽면: 화이트보드
      { sprite: 'WHITEBOARD/WHITEBOARD.png', tileX: 8, tileY: 12, scale: 1.3 },
      // 코너 화분
      { sprite: 'LARGE_PLANT/LARGE_PLANT.png', tileX: 19, tileY: 12, scale: 1.2 },
    ],
  },
];

export const CORRIDOR_COLOR = 0xE2E8F0;

// ─── 복도/공용 공간 소품 (절제하여 배치) ───
export const CORRIDOR_FURNITURE: FurniturePlacement[] = [
  // 로비 (좌측): 소파 + 테이블
  { sprite: 'SOFA/SOFA_FRONT.png', tileX: 1, tileY: 3, scale: 1.8 },
  { sprite: 'COFFEE_TABLE/COFFEE_TABLE.png', tileX: 2, tileY: 4, scale: 1.5 },
  { sprite: 'LARGE_PLANT/LARGE_PLANT.png', tileX: 1, tileY: 1, scale: 1.5 },

  // 복도 포인트 (방 사이)
  { sprite: 'LARGE_PLANT/LARGE_PLANT.png', tileX: 12, tileY: 3, scale: 1.3 },
  { sprite: 'LARGE_PLANT/LARGE_PLANT.png', tileX: 20, tileY: 3, scale: 1.3 },

  // 라운지 (좌측 하단)
  { sprite: 'SOFA/SOFA_FRONT.png', tileX: 2, tileY: 14, scale: 1.8 },
  { sprite: 'COFFEE_TABLE/COFFEE_TABLE.png', tileX: 3, tileY: 15, scale: 1.5 },
  { sprite: 'PLANT/PLANT.png', tileX: 1, tileY: 13, scale: 1.5 },

  // 우측 하단
  { sprite: 'CUSHIONED_BENCH/CUSHIONED_BENCH.png', tileX: 22, tileY: 14, scale: 1.5 },
  { sprite: 'PLANT_2/PLANT_2.png', tileX: 24, tileY: 13, scale: 1.5 },
];

export const AGENT_SPAWNS: Record<string, AgentSpawn> = {
  analyst:   { roomId: 'analysis_lab',  tileX: 7, tileY: 4 },
  architect: { roomId: 'design_studio', tileX: 15, tileY: 4 },
  manager:   { roomId: 'control_room',  tileX: 23, tileY: 4 },
};

export function getRoomAtTile(x: number, y: number): RoomDef | null {
  for (const room of ROOMS) {
    if (
      x >= room.tileX &&
      x < room.tileX + room.width &&
      y >= room.tileY &&
      y < room.tileY + room.height
    ) {
      return room;
    }
  }
  return null;
}

export function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS;
}
