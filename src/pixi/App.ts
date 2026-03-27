import * as PIXI from 'pixi.js';
import { Layer } from './types';
import {
  TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  ROOMS,
  CORRIDOR_FURNITURE,
  isInBounds,
  getRoomAtTile,
} from '@/config/office_map';

PIXI.TextureStyle.defaultOptions.scaleMode = 'nearest';

// 오피스 타일시트에서 카펫 텍스처 위치 (lab_office_tiles.png, 256x256)
const CARPET_REGIONS: Record<string, { x: number; y: number }> = {
  green:  { x: 128, y: 0 },    // 녹색 카펫
  blue:   { x: 128, y: 128 },  // 파란 카펫
  green2: { x: 160, y: 0 },    // 녹색 변형
  blue2:  { x: 160, y: 128 },  // 파란 변형
};

// 방별 카펫 + 벽 색상
const ROOM_STYLE: Record<string, { carpet: string; wallColor: number; wallShadow: number }> = {
  analysis_lab:  { carpet: 'green',  wallColor: 0x8B9DC3, wallShadow: 0x6B7D9E },
  design_studio: { carpet: 'blue',   wallColor: 0xA89BC4, wallShadow: 0x887BA4 },
  control_room:  { carpet: 'green2', wallColor: 0x7EC4A5, wallShadow: 0x5EA485 },
  meeting_hall:  { carpet: 'blue2',  wallColor: 0xC4A87E, wallShadow: 0xA4885E },
};

const CORRIDOR_COLOR = 0xD5D8DC;
const WALL_THICKNESS = 4;

export class App {
  protected app: PIXI.Application = new PIXI.Application();
  protected initialized = false;
  protected layers: Record<Layer, PIXI.Container> = {
    floor: new PIXI.Container(),
    above_floor: new PIXI.Container(),
    object: new PIXI.Container(),
  };
  protected backgroundColor = 0x2C3E50;
  private officeTileset: PIXI.Texture | null = null;

  public async init(container: HTMLElement) {
    await this.app.init({
      resizeTo: container,
      backgroundColor: this.backgroundColor,
      roundPixels: true,
      antialias: false,
    });
    this.initialized = true;

    this.app.stage.addChild(this.layers.floor);
    this.app.stage.addChild(this.layers.above_floor);
    this.app.stage.addChild(this.layers.object);
    this.layers.object.sortableChildren = true;

    // 오피스 타일시트 로드
    try {
      this.officeTileset = await PIXI.Assets.load('/sprites/office/lab_office_tiles.png');
    } catch {
      this.officeTileset = null;
    }
  }

  protected async renderTilemap() {
    this.layers.floor.removeChildren();
    this.layers.above_floor.removeChildren();

    // 1. 복도 바닥 (전체 맵)
    this.renderCorridorFloor();

    // 2. 방 바닥 (카펫 텍스처)
    for (const room of ROOMS) {
      this.renderRoomFloor(room);
    }

    // 3. 방 벽 (두꺼운 벽 + 그림자)
    for (const room of ROOMS) {
      this.renderRoomWalls(room);
      this.renderRoomLabel(room);
    }

    // 4. 가구
    await this.renderFurniture();
  }

  /**
   * 복도 바닥 — 체크무늬 패턴
   */
  private renderCorridorFloor() {
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        if (!isInBounds(x, y)) continue;
        if (getRoomAtTile(x, y)) continue; // 방 내부는 스킵

        const isLight = (x + y) % 2 === 0;
        const tile = new PIXI.Graphics();
        tile.rect(0, 0, TILE_SIZE, TILE_SIZE);
        tile.fill(isLight ? 0xE8EAED : CORRIDOR_COLOR);
        tile.position.set(x * TILE_SIZE, y * TILE_SIZE);
        this.layers.floor.addChild(tile);
      }
    }
  }

  /**
   * 방 바닥 — 카펫 텍스처 또는 단색
   */
  private renderRoomFloor(room: typeof ROOMS[number]) {
    const style = ROOM_STYLE[room.id];
    const carpetRegion = style ? CARPET_REGIONS[style.carpet] : null;

    for (let ry = 0; ry < room.height; ry++) {
      for (let rx = 0; rx < room.width; rx++) {
        const tx = room.tileX + rx;
        const ty = room.tileY + ry;

        if (this.officeTileset && carpetRegion) {
          // 타일시트에서 카펫 텍스처 추출
          const frame = new PIXI.Rectangle(carpetRegion.x, carpetRegion.y, 32, 32);
          const texture = new PIXI.Texture({ source: this.officeTileset.source, frame });
          const sprite = new PIXI.Sprite(texture);
          sprite.position.set(tx * TILE_SIZE, ty * TILE_SIZE);
          this.layers.floor.addChild(sprite);
        } else {
          // 폴백: 단색
          const tile = new PIXI.Graphics();
          tile.rect(0, 0, TILE_SIZE, TILE_SIZE);
          tile.fill(room.floorColor);
          tile.position.set(tx * TILE_SIZE, ty * TILE_SIZE);
          this.layers.floor.addChild(tile);
        }
      }
    }
  }

  /**
   * 방 벽 — 두꺼운 벽 + 그림자 + 문 입구
   */
  private renderRoomWalls(room: typeof ROOMS[number]) {
    const style = ROOM_STYLE[room.id];
    const wallColor = style?.wallColor ?? 0x95A5A6;
    const shadowColor = style?.wallShadow ?? 0x7F8C8D;

    const sx = room.tileX * TILE_SIZE;
    const sy = room.tileY * TILE_SIZE;
    const w = room.width * TILE_SIZE;
    const h = room.height * TILE_SIZE;
    const t = WALL_THICKNESS;

    // 그림자 (벽 오른쪽/아래쪽에 살짝)
    const shadow = new PIXI.Graphics();
    shadow.rect(sx + 2, sy + 2, w, h);
    shadow.fill({ color: 0x000000, alpha: 0.08 });
    this.layers.above_floor.addChild(shadow);

    // 상단 벽
    const topWall = new PIXI.Graphics();
    topWall.rect(sx - t, sy - t, w + t * 2, t);
    topWall.fill(wallColor);
    this.layers.above_floor.addChild(topWall);

    // 하단 벽 (중앙에 문 열림)
    const doorWidth = TILE_SIZE * 2;
    const doorStart = sx + (w - doorWidth) / 2;
    // 좌측
    const bottomL = new PIXI.Graphics();
    bottomL.rect(sx - t, sy + h, doorStart - sx + t, t);
    bottomL.fill(shadowColor);
    this.layers.above_floor.addChild(bottomL);
    // 우측
    const bottomR = new PIXI.Graphics();
    bottomR.rect(doorStart + doorWidth, sy + h, sx + w + t - doorStart - doorWidth, t);
    bottomR.fill(shadowColor);
    this.layers.above_floor.addChild(bottomR);

    // 좌측 벽
    const leftWall = new PIXI.Graphics();
    leftWall.rect(sx - t, sy - t, t, h + t * 2);
    leftWall.fill(wallColor);
    this.layers.above_floor.addChild(leftWall);

    // 우측 벽
    const rightWall = new PIXI.Graphics();
    rightWall.rect(sx + w, sy - t, t, h + t * 2);
    rightWall.fill(shadowColor);
    this.layers.above_floor.addChild(rightWall);

    // 벽 상단 밝은 선 (하이라이트)
    const highlight = new PIXI.Graphics();
    highlight.moveTo(sx - t, sy - t);
    highlight.lineTo(sx + w + t, sy - t);
    highlight.stroke({ width: 1, color: 0xFFFFFF, alpha: 0.3 });
    this.layers.above_floor.addChild(highlight);
  }

  /**
   * 방 이름 라벨
   */
  private renderRoomLabel(room: typeof ROOMS[number]) {
    const style = ROOM_STYLE[room.id];
    const label = new PIXI.Text({
      text: room.label,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 10,
        fontWeight: 'bold',
        fill: style?.wallColor ?? 0xFFFFFF,
        stroke: { color: 0x000000, width: 2 },
      },
    });
    label.anchor.set(0.5, 1);
    label.position.set(
      (room.tileX + room.width / 2) * TILE_SIZE,
      room.tileY * TILE_SIZE - WALL_THICKNESS - 2,
    );
    this.layers.above_floor.addChild(label);
  }

  private async renderFurniture() {
    for (const room of ROOMS) {
      for (const furn of room.furniture) {
        await this.placeFurnitureSprite(furn);
      }
    }
    for (const furn of CORRIDOR_FURNITURE) {
      await this.placeFurnitureSprite(furn);
    }
    this.sortObjectsByY();
  }

  private async placeFurnitureSprite(furn: { sprite: string; tileX: number; tileY: number; scale?: number }) {
    try {
      const path = `/sprites/furniture/${furn.sprite}`;
      const texture = await PIXI.Assets.load(path);
      const sprite = new PIXI.Sprite(texture);
      const scale = furn.scale ?? 1;
      sprite.scale.set(scale);
      sprite.anchor.set(0.5, 1);
      sprite.x = furn.tileX * TILE_SIZE + TILE_SIZE / 2;
      sprite.y = furn.tileY * TILE_SIZE + TILE_SIZE;
      sprite.zIndex = sprite.y;
      this.layers.object.addChild(sprite);
    } catch {
      // pass
    }
  }

  public convertTileToScreenCoordinates(x: number, y: number) {
    return { x: x * TILE_SIZE, y: y * TILE_SIZE };
  }

  public convertScreenToTileCoordinates(x: number, y: number) {
    return { x: Math.floor(x / TILE_SIZE), y: Math.floor(y / TILE_SIZE) };
  }

  public sortObjectsByY() {
    for (const child of this.layers.object.children) {
      child.zIndex = child.y;
    }
  }

  public getApp() {
    if (!this.initialized) throw new Error('App not initialized');
    return this.app;
  }

  public destroy() {
    if (this.initialized) {
      this.app.destroy();
      this.initialized = false;
    }
  }
}
