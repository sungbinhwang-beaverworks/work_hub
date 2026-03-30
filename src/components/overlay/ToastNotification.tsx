"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type ToastType = "info" | "success" | "error";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  actionLabel?: string;      // "결과 보기" / "상세 보기"
  actionPipelineId?: string; // 액션 클릭 시 포커스할 파이프라인 ID
  autoDismissMs?: number;    // 0 이면 자동 닫힘 안 함
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onAction?: (pipelineId: string) => void;
}

const TOAST_STYLE: Record<
  ToastType,
  { stripe: string; icon: string; iconBg: string }
> = {
  info: {
    stripe: "var(--color-accent-analysis, #3b82f6)",
    icon: "",
    iconBg: "transparent",
  },
  success: {
    stripe: "var(--color-status-working)",
    icon: "✓",
    iconBg: "var(--color-status-working)",
  },
  error: {
    stripe: "var(--color-status-error)",
    icon: "!",
    iconBg: "var(--color-status-error)",
  },
};

function SingleToast({
  toast,
  onDismiss,
  onAction,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  onAction?: (pipelineId: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);

  const startDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [toast.id, onDismiss]);

  // 자동 닫힘 타이머
  useEffect(() => {
    const ms = toast.autoDismissMs;
    if (!ms || ms <= 0) return;

    timerRef.current = setTimeout(() => {
      if (!pausedRef.current) {
        startDismiss();
      }
    }, ms);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.autoDismissMs, startDismiss]);

  const handleMouseEnter = () => {
    pausedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    pausedRef.current = false;
    const ms = toast.autoDismissMs;
    if (ms && ms > 0) {
      timerRef.current = setTimeout(() => startDismiss(), ms);
    }
  };

  const style = TOAST_STYLE[toast.type];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: 360,
        backgroundColor: "rgba(255, 255, 255, 0.97)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
        overflow: "hidden",
        display: "flex",
        animation: exiting
          ? "toastSlideOut 0.2s ease-in forwards"
          : "toastSlideIn 0.3s ease-out",
      }}
    >
      {/* 좌측 색상 스트라이프 */}
      <div
        style={{
          width: 4,
          flexShrink: 0,
          backgroundColor: style.stripe,
        }}
      />

      <div
        style={{
          flex: 1,
          padding: "var(--space-3) var(--space-3)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        {/* 첫 줄: 아이콘 + 메시지 + 닫기 */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-2)",
          }}
        >
          {/* 아이콘 (info는 아이콘 없음) */}
          {style.icon && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: style.iconBg,
                color: "var(--color-white)",
                fontSize: "var(--fs-xs)",
                fontWeight: "var(--fw-bold)",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {style.icon}
            </span>
          )}

          {/* 메시지 */}
          <span
            style={{
              flex: 1,
              fontSize: "var(--fs-xs)",
              color: "var(--color-typo-title)",
              lineHeight: 1.5,
            }}
          >
            {toast.message}
          </span>

          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={() => startDismiss()}
            style={{
              width: 20,
              height: 20,
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "var(--fs-xs)",
              color: "var(--color-typo-disabled)",
              flexShrink: 0,
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* 액션 버튼 */}
        {toast.actionLabel && toast.actionPipelineId && (
          <button
            type="button"
            onClick={() => {
              if (onAction && toast.actionPipelineId) {
                onAction(toast.actionPipelineId);
              }
              startDismiss();
            }}
            style={{
              alignSelf: "flex-start",
              fontSize: "var(--fs-xs)",
              fontWeight: "var(--fw-medium)",
              color: style.stripe,
              backgroundColor: "transparent",
              border: `1px solid ${style.stripe}`,
              borderRadius: "var(--radius-sm)",
              padding: "4px 12px",
              cursor: "pointer",
            }}
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ToastNotification({ toasts, onDismiss, onAction }: Props) {
  // 최대 3개까지만 표시
  const visibleToasts = toasts.slice(0, 3);

  if (visibleToasts.length === 0) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {visibleToasts.map((toast) => (
          <SingleToast
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
            onAction={onAction}
          />
        ))}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes toastSlideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
}
