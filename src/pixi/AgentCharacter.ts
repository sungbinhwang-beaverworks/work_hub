import * as PIXI from 'pixi.js';
import type { AgentInfo } from '@/lib/agents/types';
import { TILE_SIZE } from '@/config/office_map';

/**
 * 에이전트 캐릭터 (프로그래매틱 렌더링 MVP)
 *
 * PIXI.Container 구성:
 *   - 원형 그림자
 *   - 몸체 원형 (accentColor)
 *   - 상태 링 (idle/working/error)
 *   - 이모지 텍스트
 *   - 이름표 텍스트
 */

// 상태별 링 색상
const STATUS_COLORS: Record<string, number> = {
  idle: 0x9DA0A8,
  working: 0x18A358,
  error: 0xEB2341,
};

// 방별 accent 색상 매핑
const ROOM_ACCENT: Record<string, number> = {
  analysis_lab: 0x3B82F6,
  design_studio: 0x8B5CF6,
  control_room: 0x10B981,
};

// 에이전트별 캐릭터 스킨 (Gather Clone 스프라이트시트)
const AGENT_SKINS: Record<string, string> = {
  analyst: 'Character_004',
  architect: 'Character_010',
  manager: 'Character_001',
};

function formatText(message: string, maxLength: number): string {
  message = message.trim();
  const words = message.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (word.length > maxLength) {
      if (currentLine) {
        lines.push(currentLine.trim());
        currentLine = '';
      }
      for (let i = 0; i < word.length; i += maxLength) {
        lines.push(word.substring(i, i + maxLength));
      }
    } else if (currentLine.length + word.length + 1 > maxLength) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  return lines.join('\n');
}

export class AgentCharacter {
  public parent: PIXI.Container = new PIXI.Container();
  public agentId: string;
  public currentTileX: number;
  public currentTileY: number;

  private agentInfo: AgentInfo;
  private bodyGraphics: PIXI.Graphics = new PIXI.Graphics();
  private statusRing: PIXI.Graphics = new PIXI.Graphics();
  private shadowGraphics: PIXI.Graphics = new PIXI.Graphics();
  private emojiText: PIXI.Text;
  private nameText: PIXI.Text;
  private bubbleContainer: PIXI.Container | null = null;
  private messageTimeout: ReturnType<typeof setTimeout> | null = null;

  // 말풍선 페이드아웃용
  private bubbleDuration = 0;
  private bubbleCreatedAt = 0;

  private isSelected = false;
  private selectionRing: PIXI.Graphics = new PIXI.Graphics();
  private characterSprite: PIXI.Sprite | null = null;

  // 상태 펄스 애니메이션용
  private pulsePhase = 0;

  constructor(agentInfo: AgentInfo, tileX: number, tileY: number) {
    this.agentInfo = agentInfo;
    this.agentId = agentInfo.id;
    this.currentTileX = tileX;
    this.currentTileY = tileY;

    // 이모지 텍스트 (스프라이트 로딩 실패 시 폴백)
    this.emojiText = new PIXI.Text({
      text: agentInfo.emoji || '🤖',
      style: { fontSize: 18 },
    });

    // 이름표 텍스트
    this.nameText = new PIXI.Text({
      text: agentInfo.name,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 9,
        fill: 0xFFFFFF,
        fontWeight: 'bold',
      },
    });

    this.buildVisuals();
    this.setPosition(tileX, tileY);
    this.loadCharacterSprite();

    // 클릭 이벤트
    this.parent.eventMode = 'static';
    this.parent.cursor = 'pointer';
    this.parent.hitArea = new PIXI.Circle(0, -8, 24);
  }

  /**
   * 캐릭터 스프라이트 시트 로딩 (192x192, 48x48 프레임, 4방향 4프레임)
   */
  private async loadCharacterSprite() {
    const skinName = AGENT_SKINS[this.agentId] ?? 'Character_001';
    const src = `/sprites/characters/${skinName}.png`;

    try {
      const texture = await PIXI.Assets.load(src);

      // 스프라이트시트 데이터 (Gather Clone 포맷: 192x192, 4x4 그리드, 48x48 프레임)
      const frameSize = 48;
      const idleFrameCol = 1; // 각 방향의 2번째 프레임이 idle
      const idleRow = 0; // row 0 = walk_down → idle_down

      // idle_down 단일 프레임으로 서 있는 모습
      const rect = new PIXI.Rectangle(idleFrameCol * frameSize, idleRow * frameSize, frameSize, frameSize);
      const idleTexture = new PIXI.Texture({ source: texture.source, frame: rect });

      const sprite = new PIXI.Sprite(idleTexture);
      sprite.anchor.set(0.5, 1);
      sprite.position.set(0, 4);
      sprite.scale.set(0.8);

      // 이모지를 스프라이트로 교체
      this.emojiText.visible = false;
      this.bodyGraphics.visible = false;

      // 그림자 위, 이름표 아래에 삽입
      const nameIdx = this.parent.getChildIndex(this.nameText);
      this.parent.addChildAt(sprite, nameIdx);
      this.characterSprite = sprite;
    } catch {
      // 스프라이트 로딩 실패 시 이모지 폴백 유지
    }
  }

  /**
   * 프로그래매틱으로 캐릭터 구성
   */
  private buildVisuals() {
    const accent = ROOM_ACCENT[this.agentInfo.room] ?? 0x6366F1;

    // 선택 하이라이트 링 (초기엔 숨김)
    this.selectionRing.circle(0, -2, 18);
    this.selectionRing.stroke({ width: 2, color: accent, alpha: 0.4 });
    this.selectionRing.visible = false;
    this.parent.addChild(this.selectionRing);

    // 그림자
    this.shadowGraphics.ellipse(0, 2, 12, 5);
    this.shadowGraphics.fill({ color: 0x000000, alpha: 0.15 });
    this.parent.addChild(this.shadowGraphics);

    // 몸체 원형
    this.bodyGraphics.circle(0, -8, 14);
    this.bodyGraphics.fill(accent);
    this.parent.addChild(this.bodyGraphics);

    // 상태 링
    this.drawStatusRing(this.agentInfo.status);
    this.parent.addChild(this.statusRing);

    // 이모지
    this.emojiText.anchor.set(0.5, 0.5);
    this.emojiText.position.set(0, -10);
    this.parent.addChild(this.emojiText);

    // 이름표 (아래쪽)
    this.nameText.anchor.set(0.5, 0);
    this.nameText.position.set(0, 8);
    this.parent.addChild(this.nameText);
  }

  /**
   * 상태 링 다시 그리기
   */
  private drawStatusRing(status: string) {
    this.statusRing.clear();
    const color = STATUS_COLORS[status] ?? STATUS_COLORS.idle;
    this.statusRing.circle(0, -8, 16);
    this.statusRing.stroke({ width: 2, color, alpha: 0.8 });
  }

  /**
   * 즉시 위치 설정
   */
  public setPosition(tileX: number, tileY: number) {
    this.currentTileX = tileX;
    this.currentTileY = tileY;
    // 타일 중앙에 배치
    this.parent.x = tileX * TILE_SIZE + TILE_SIZE / 2;
    this.parent.y = tileY * TILE_SIZE + TILE_SIZE / 2 + 4;
  }

  /**
   * 에이전트 상태 업데이트 (idle/working/error)
   */
  public updateStatus(status: 'idle' | 'working' | 'error') {
    this.agentInfo.status = status;
    this.drawStatusRing(status);
  }

  /**
   * 선택 상태 토글
   */
  public setSelected(selected: boolean) {
    this.isSelected = selected;
    this.selectionRing.visible = selected;
  }

  /**
   * 말풍선 표시 (배경 + 꼬리 + 그림자 포함)
   */
  public showMessage(text: string, durationMs = 5000) {
    // 기존 말풍선 제거
    this.clearBubble();

    const formatted = formatText(text, 30);
    const padX = 6;
    const padY = 4;
    const tailHeight = 5;
    const tailBase = 8;
    const cornerRadius = 6;

    // 텍스트 생성
    const bubbleText = new PIXI.Text({
      text: formatted,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 8,
        fill: 0x333333,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 120,
      },
    });
    // 텍스트 크기 측정
    const textW = bubbleText.width;
    const textH = bubbleText.height;
    const bgW = textW + padX * 2;
    const bgH = textH + padY * 2;

    // 컨테이너
    const container = new PIXI.Container();

    // 그림자 (약간 오프셋)
    const shadow = new PIXI.Graphics();
    shadow.roundRect(-bgW / 2 + 1, -bgH + 2, bgW, bgH, cornerRadius);
    shadow.fill({ color: 0x000000, alpha: 0.08 });
    container.addChild(shadow);

    // 배경
    const bg = new PIXI.Graphics();
    bg.roundRect(-bgW / 2, -bgH, bgW, bgH, cornerRadius);
    bg.fill({ color: 0xFFFFFF, alpha: 0.95 });
    bg.stroke({ width: 1, color: 0xE2E8F0, alpha: 1 });
    container.addChild(bg);

    // 꼬리 (삼각형, 하단 중앙)
    const tail = new PIXI.Graphics();
    tail.moveTo(-tailBase / 2, 0);
    tail.lineTo(0, tailHeight);
    tail.lineTo(tailBase / 2, 0);
    tail.closePath();
    tail.fill({ color: 0xFFFFFF, alpha: 0.95 });
    container.addChild(tail);

    // 텍스트 배치 (배경 내부 중앙)
    bubbleText.anchor.set(0.5, 1);
    bubbleText.position.set(0, -padY);
    container.addChild(bubbleText);

    // 컨테이너 위치: 캐릭터 위
    container.position.set(0, -36);
    this.parent.addChild(container);

    this.bubbleContainer = container;
    this.bubbleDuration = durationMs;
    this.bubbleCreatedAt = Date.now();

    this.messageTimeout = setTimeout(() => {
      this.clearBubble();
    }, durationMs);
  }

  /**
   * 기존 말풍선이 있으면 무시하고, 없을 때만 표시
   */
  public showMessageIfIdle(text: string, durationMs = 5000) {
    if (this.bubbleContainer) return;
    this.showMessage(text, durationMs);
  }

  /**
   * 말풍선 제거
   */
  private clearBubble() {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
    if (this.bubbleContainer) {
      this.parent.removeChild(this.bubbleContainer);
      this.bubbleContainer.destroy({ children: true });
      this.bubbleContainer = null;
    }
  }

  /**
   * Ticker 콜백: 상태 펄스 애니메이션 + 말풍선 페이드아웃
   */
  public tick(deltaTime: number) {
    this.pulsePhase += deltaTime * 0.03;

    if (this.agentInfo.status === 'working') {
      const pulse = 1.0 + Math.sin(this.pulsePhase * 3) * 0.06;
      this.statusRing.scale.set(pulse);
    } else {
      this.statusRing.scale.set(1);
    }

    // 선택 링 펄스
    if (this.isSelected) {
      const alpha = 0.3 + Math.sin(this.pulsePhase * 2) * 0.15;
      this.selectionRing.alpha = alpha;
    }

    // 말풍선 페이드아웃 (마지막 500ms)
    if (this.bubbleContainer) {
      const elapsed = Date.now() - this.bubbleCreatedAt;
      const remaining = this.bubbleDuration - elapsed;
      if (remaining < 500 && remaining > 0) {
        this.bubbleContainer.alpha = remaining / 500;
      }
    }
  }

  public destroy() {
    this.clearBubble();
    this.parent.destroy({ children: true });
  }
}
