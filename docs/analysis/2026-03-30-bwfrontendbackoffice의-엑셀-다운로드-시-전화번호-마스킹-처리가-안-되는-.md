> 생성일: 2026-03-30
> 생성 에이전트: analyst
> 파이프라인: 337a6581-dd6a-4c82-9500-75e884e6457d
# 분석 보고서: bw_frontend_backoffice 엑셀 다운로드 시 회원 전화번호 마스킹 미처리 이슈

## 1. 분석 대상
`bw_frontend_backoffice` 프로젝트 내 백엔드 API 호출 정의 파일(`src/apis` 디렉토리 하위) 및 `package.json` 파일을 분석하여, 회원 전화번호(`mobileNo`) 데이터의 노출 가능성 및 엑셀 다운로드 기능과의 연관성을 파악합니다.

## 2. 현황
사용자 보고에 따르면 `bw_frontend_backoffice` 시스템에서 엑셀 다운로드 시 회원 전화번호가 마스킹 처리 없이 노출되는 개인정보 보호 이슈가 발생하고 있습니다. 이는 개인정보 보호 규정 위반의 소지가 있습니다.

## 3. 발견 사항

### 3.1. `mobileNo` 필드를 포함하는 API 목록
`src/apis` 디렉토리 내에서 `mobileNo` 필드를 응답 모델에 포함하는 `useQuery` 기반 API는 총 4개입니다. 이 API들은 백오피스 시스템의 사용자, 계약, 설치 관련 정보를 조회하는 데 사용됩니다.

| 파일 경로                               | API 경로                           | 응답 모델 내 `mobileNo` 필드 위치 | 설명                                     |
| :-------------------------------------- | :--------------------------------- | :-------------------------------- | :--------------------------------------- |
| `src/apis/cntr/contract/list.ts`        | `/bw/cntr/contract/list`           | `CntrInfo.mobileNo`                 | 계약 목록 조회 시 사용자 전화번호          |
| `src/apis/cntr/install/list.ts`         | `/bw/cntr/install/list`            | `InstlInfo.mobileNo`                | 설치 목록 조회 시 사용자 전화번호          |
| `src/apis/cntr/user/list.ts`            | `/bw/cntr/user/list`               | `UserListData.mobileNo`             | 사용자 목록 조회 시 대표자 전화번호        |
| `src/apis/cntr/user/totlist.ts`         | `/bw/cntr/user/totlist`            | `UserInfo.mobileNo`                 | 사용자 종합 정보 조회 시 회원 전화번호     |

(근거: 위 4개 파일의 `type` 정의에서 `mobileNo: string` 확인)

### 3.2. API 응답 데이터 처리 방식
분석된 API 파일들은 `@tanstack/react-query`의 `useQuery` 훅을 사용하여 백엔드에서 데이터를 가져옵니다. `queryFn` 내부에서는 대부분 `fetch` API를 직접 호출하거나 `queryGeneric` 헬퍼 함수를 사용하여 HTTP 요청을 보냅니다.
응답 데이터는 `res.json()`을 통해 JSON 형식으로 파싱되어 반환됩니다. 이 과정에서 `mobileNo` 필드에 대한 어떠한 명시적인 마스킹 또는 변환 로직도 클라이언트 측 API 정의 파일에서는 발견되지 않았습니다.
(근거: `useQuery*` 훅 내부의 `queryFn` 구현 및 `queryGeneric` 함수 로직 확인)

### 3.3. 엑셀 다운로드 기능 관련 라이브러리
`package.json` 파일의 `dependencies`에는 다음과 같은 데이터 내보내기 및 엑셀 관련 라이브러리가 포함되어 있습니다.

*   `exceljs`: 엑셀 파일 생성 및 조작
*   `file-saver`: 클라이언트 측에서 파일을 저장
*   `xlsx`: 엑셀 파일 파싱 및 생성
*   `jspdf`, `jspdf-autotable`: PDF 문서 생성

(근거: `package.json` 의존성 목록 확인)
이는 프로젝트에 엑셀 및 기타 문서 다운로드 기능이 구현되어 있음을 시사합니다.

### 3.4. 인증 방식
대부분의 `/bw/` 경로 API 호출은 `GenerateHmac` 함수를 사용하여 `Hmac` 헤더를 생성하고 인증에 활용하고 있습니다. (예외: `/ba/` 경로의 일부 API는 Hmac을 사용하지 않음) 이는 API 통신 자체의 무결성과 인증은 강화되었음을 의미하나, 응답 데이터 내의 개인정보 마스킹과는 직접적인 관련이 없습니다.
(근거: `GenerateHmac` 함수를 사용하는 `mutationFn` 및 `queryFn` 구현 24개 파일에서 확인)

## 4. 권고

### 4.1