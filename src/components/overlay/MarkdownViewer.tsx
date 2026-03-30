"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
  filename: string;
  onCollapse: () => void;
}

export default function MarkdownViewer({ content, filename, onCollapse }: Props) {
  return (
    <div
      style={{
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      {/* 뷰어 헤더 */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "var(--space-2) var(--space-3)",
          backgroundColor: "rgba(0, 0, 0, 0.03)",
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-subtitle)", fontWeight: "var(--fw-medium)" }}>
          {filename}
        </span>
        <button
          type="button"
          onClick={onCollapse}
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--color-typo-disabled)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          접기
        </button>
      </div>

      {/* 마크다운 본문 */}
      <div
        className="markdown-viewer-content"
        style={{
          maxHeight: 400,
          overflowY: "auto",
          padding: "var(--space-3) var(--space-4)",
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>

      {/* 마크다운 타이포그래피 스타일 */}
      <style>{`
        .markdown-viewer-content h1 {
          font-size: var(--fs-lg);
          font-weight: var(--fw-semibold);
          color: var(--color-typo-title);
          margin: 0 0 var(--space-3);
          padding-bottom: var(--space-2);
          border-bottom: 1px solid var(--color-divider);
        }
        .markdown-viewer-content h2 {
          font-size: var(--fs-md);
          font-weight: var(--fw-semibold);
          color: var(--color-typo-title);
          margin: var(--space-4) 0 var(--space-2);
        }
        .markdown-viewer-content h3 {
          font-size: var(--fs-sm);
          font-weight: var(--fw-semibold);
          color: var(--color-typo-title);
          margin: var(--space-3) 0 var(--space-2);
        }
        .markdown-viewer-content p {
          font-size: var(--fs-xs);
          color: var(--color-typo-body);
          line-height: 1.6;
          margin: 0 0 var(--space-2);
        }
        .markdown-viewer-content ul,
        .markdown-viewer-content ol {
          font-size: var(--fs-xs);
          color: var(--color-typo-body);
          line-height: 1.6;
          padding-left: var(--space-4);
          margin: 0 0 var(--space-2);
        }
        .markdown-viewer-content li {
          margin-bottom: var(--space-1);
        }
        .markdown-viewer-content code {
          font-family: "SF Mono", "Fira Code", monospace;
          font-size: var(--fs-xs);
          background-color: rgba(0, 0, 0, 0.06);
          padding: 4px;
          border-radius: var(--radius-sm);
        }
        .markdown-viewer-content pre {
          background-color: rgba(0, 0, 0, 0.04);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          overflow-x: auto;
          margin: 0 0 var(--space-3);
        }
        .markdown-viewer-content pre code {
          background: none;
          padding: 0;
        }
        .markdown-viewer-content table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--fs-xs);
          margin: 0 0 var(--space-3);
        }
        .markdown-viewer-content th,
        .markdown-viewer-content td {
          border: 1px solid var(--color-divider);
          padding: var(--space-1) var(--space-2);
          text-align: left;
        }
        .markdown-viewer-content th {
          background-color: rgba(0, 0, 0, 0.03);
          font-weight: var(--fw-medium);
          color: var(--color-typo-title);
        }
        .markdown-viewer-content td {
          color: var(--color-typo-body);
        }
        .markdown-viewer-content blockquote {
          border-left: 3px solid var(--color-divider);
          padding-left: var(--space-3);
          margin: 0 0 var(--space-2);
          color: var(--color-typo-subtitle);
          font-style: italic;
        }
        .markdown-viewer-content hr {
          border: none;
          border-top: 1px solid var(--color-divider);
          margin: var(--space-3) 0;
        }
        .markdown-viewer-content a {
          color: var(--color-accent-analysis, #3b82f6);
          text-decoration: none;
        }
        .markdown-viewer-content a:hover {
          text-decoration: underline;
        }
        .markdown-viewer-content strong {
          font-weight: var(--fw-semibold);
          color: var(--color-typo-title);
        }
      `}</style>
    </div>
  );
}
