import * as PIXI from 'pixi.js';
import { App } from './App';
import { AgentCharacter } from './AgentCharacter';
import { AGENT_SPAWNS, TILE_SIZE, MAP_COLS, MAP_ROWS } from '@/config/office_map';
import {
  PIPELINE_STEP_AGENT,
  PIPELINE_STEP_BUBBLE,
  PIPELINE_STEP_DURATION,
  interMessageToBubble,
} from '@/config/pipeline_visual';
import type { AgentInfo, InterAgentMessage, PipelineStatus } from '@/lib/agents/types';

/**
 * OfficeApp -- App 상속. 카메라, 에이전트 캐릭터 관리, 클릭 이벤트.
 * Gather Clone의 PlayApp에서 소켓/멀티/키보드/비디오챗을 제거한 단순 버전.
 */
export class OfficeApp extends App {
  private scale = 1.5;
  private characters: Map<string, AgentCharacter> = new Map();
  private onSelectAgent: ((agentId: string) => void) | null = null;
  private selectedAgentId: string | null = null;

  // 드래그(패닝) 상태
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private pivotStart = { x: 0, y: 0 };
  private dragMoved = false;

  public override async init(container: HTMLElement) {
    await super.init(container);

    // 타일맵 렌더링 (가구 스프라이트 포함)
    await this.renderTilemap();

    // 스케일 설정
    this.setScale(this.scale);

    // 카메라를 맵 중앙으로
    this.centerCamera();

    // 이벤트 설정
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.setupInputEvents();

    // 리사이즈 대응
    this.app.renderer.on('resize', this.onResize);

    // 에이전트 펄스 애니메이션 Ticker
    PIXI.Ticker.shared.add(this.onTick);
  }

  /**
   * 에이전트 캐릭터 생성/배치
   */
  public spawnAgents(agents: AgentInfo[]) {
    // 기존 캐릭터 제거
    for (const char of this.characters.values()) {
      this.layers.object.removeChild(char.parent);
      char.destroy();
    }
    this.characters.clear();

    for (const agent of agents) {
      const spawn = AGENT_SPAWNS[agent.id];
      if (!spawn) continue;

      const character = new AgentCharacter(agent, spawn.tileX, spawn.tileY);
      character.parent.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation();
        this.handleAgentClick(agent.id);
      });

      this.layers.object.addChild(character.parent);
      this.characters.set(agent.id, character);
    }

    this.sortObjectsByY();
  }

  /**
   * 에이전트 상태 업데이트 (status, current_task 등)
   */
  public updateAgents(agents: AgentInfo[]) {
    for (const agent of agents) {
      const char = this.characters.get(agent.id);
      if (char) {
        char.updateStatus(agent.status);
        if (agent.status === 'working' && agent.current_task) {
          char.showMessage(agent.current_task, 8000);
        }
      }
    }
  }

  /**
   * 외부에서 에이전트 선택 (React에서 호출)
   */
  public selectAgent(agentId: string | null) {
    // 이전 선택 해제
    if (this.selectedAgentId) {
      const prev = this.characters.get(this.selectedAgentId);
      if (prev) prev.setSelected(false);
    }

    this.selectedAgentId = agentId;

    if (agentId) {
      const char = this.characters.get(agentId);
      if (char) {
        char.setSelected(true);
        this.panToAgent(agentId);
      }
    }
  }

  /**
   * React 콜백 등록
   */
  public setOnSelectAgent(callback: (agentId: string) => void) {
    this.onSelectAgent = callback;
  }

  // -- 내부 메서드 --

  private handleAgentClick(agentId: string) {
    if (this.onSelectAgent) {
      this.onSelectAgent(agentId);
    }
  }

  private setScale(newScale: number) {
    this.scale = newScale;
    this.app.stage.scale.set(this.scale);
  }

  /**
   * 카메라를 맵 중앙으로 이동
   */
  private centerCamera() {
    const mapCenterX = (MAP_COLS * TILE_SIZE) / 2;
    const mapCenterY = (MAP_ROWS * TILE_SIZE) / 2;
    const pivotX = mapCenterX - (this.app.screen.width / 2) / this.scale;
    const pivotY = mapCenterY - (this.app.screen.height / 2) / this.scale;
    this.app.stage.pivot.set(pivotX, pivotY);
  }

  /**
   * 에이전트 위치로 카메라 패닝
   */
  private panToAgent(agentId: string) {
    const char = this.characters.get(agentId);
    if (!char) return;

    const targetX = char.parent.x - (this.app.screen.width / 2) / this.scale;
    const targetY = char.parent.y - (this.app.screen.height / 2) / this.scale;
    this.app.stage.pivot.set(targetX, targetY);
  }

  /**
   * 입력 이벤트 설정 (클릭, 드래그 패닝, 줌)
   */
  private setupInputEvents() {
    // 드래그 패닝
    this.app.stage.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      this.isDragging = true;
      this.dragMoved = false;
      this.dragStart.x = e.globalX;
      this.dragStart.y = e.globalY;
      this.pivotStart.x = this.app.stage.pivot.x;
      this.pivotStart.y = this.app.stage.pivot.y;
    });

    this.app.stage.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
      if (!this.isDragging) return;

      const dx = e.globalX - this.dragStart.x;
      const dy = e.globalY - this.dragStart.y;

      // 최소 이동 거리 넘으면 드래그로 판정
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.dragMoved = true;
      }

      this.app.stage.pivot.set(
        this.pivotStart.x - dx / this.scale,
        this.pivotStart.y - dy / this.scale,
      );
    });

    this.app.stage.on('pointerup', () => {
      this.isDragging = false;
    });

    this.app.stage.on('pointerupoutside', () => {
      this.isDragging = false;
    });

    // 줌 (마우스 휠)
    this.app.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.5, Math.min(2.5, this.scale + zoomDelta));
      this.setScale(newScale);
      this.centerCamera();
    }, { passive: false });
  }

  /**
   * Ticker 콜백: 에이전트 펄스 애니메이션
   */
  private onTick = ({ deltaTime }: { deltaTime: number }) => {
    for (const char of this.characters.values()) {
      char.tick(deltaTime);
    }
  };

  /**
   * 리사이즈 대응
   */
  private onResize = () => {
    this.app.stage.hitArea = this.app.screen;
    this.centerCamera();
  };

  /**
   * 파이프라인 상태 전환 시 담당 에이전트에 말풍선 표시
   */
  public showPipelineBubble(status: PipelineStatus) {
    const agentId = PIPELINE_STEP_AGENT[status];
    if (!agentId) return;

    const text = PIPELINE_STEP_BUBBLE[status];
    if (!text) return;

    const char = this.characters.get(agentId);
    if (!char) return;

    const duration = PIPELINE_STEP_DURATION[status] ?? 6000;
    // pipeline 말풍선은 우선순위가 낮으므로 idle일 때만 표시
    char.showMessageIfIdle(text, duration);
  }

  /**
   * 에이전트 간 메시지 수신 시 양쪽 캐릭터에 말풍선 표시
   */
  public showInterMessageBubble(msg: InterAgentMessage) {
    const fromChar = this.characters.get(msg.from_agent);
    const toChar = this.characters.get(msg.to_agent);

    if (fromChar) {
      const text = interMessageToBubble(
        msg.type,
        msg.payload as Record<string, string | undefined>,
        true,
      );
      if (text) fromChar.showMessage(text, 5000);
    }

    // 수신 측은 약간 딜레이 (전달 느낌)
    if (toChar) {
      setTimeout(() => {
        const text = interMessageToBubble(
          msg.type,
          msg.payload as Record<string, string | undefined>,
          false,
        );
        if (text) toChar.showMessage(text, 6000);
      }, 800);
    }
  }

  public override destroy() {
    PIXI.Ticker.shared.remove(this.onTick);
    this.app.renderer.off('resize', this.onResize);

    for (const char of this.characters.values()) {
      char.destroy();
    }
    this.characters.clear();

    super.destroy();
  }
}
