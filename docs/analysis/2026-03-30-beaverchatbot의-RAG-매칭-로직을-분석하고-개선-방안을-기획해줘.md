> 생성일: 2026-03-30
> 생성 에이전트: analyst
> 파이프라인: 87b60b35-25b3-4a96-8115-3cd1087ef3a1
# 분석 보고서: RAG 매칭 로직 개선

## 1. 분석 대상

*   **프로젝트**: `beaver_chat_bot`
*   **주요 파일**:
    *   `src/app/api/chat/route.ts`: RAG 검색, 키워드 추출, 매뉴얼 매칭 로직의 핵심 구현체.
    *   `supabase/schema.sql`: `match_chunks` RPC 함수 정의.
    *   `scripts/ingest.ts`: 벡터DB 데이터 적재 및 청크 변환 로직 (특히 `modes` 필드 처리).
*   **관련 데이터**:
    *   `chunks` 테이블 (총 153개): 매뉴