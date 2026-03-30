# 매장외부연동설정 전수 분석 — T-order 연동 기획 근거

> 분석일: 2026-03-30 | 마감일: 2026-04-01
> 목적: 기존 외부연동 모달 패턴 전수 파악 후, T-order 연동설정 모달 기획 얼개 도출

---

## 1. 기존 외부연동 모달 전수 분석

### 1-1. LinkSettingModal (DP/DK/OK)

| 항목 | 내용 |
|------|------|
| **모달 제목** | OK POS일 때: `OK POS 연동설정` / 그 외: `연동설정(일반매장)` |
| **연동대상 코드** | DP(드림하이테크 일반), DK(드림하이테크 키오스크), OK(OK POS) |
| **입력 필드** | |
| - 드림 백오피스 URL | Input, 필수 (OK POS 제외) |
| - 매장 IP | Input, 필수 |
| - Port | Input, 필수 |
| **테이블** | 장비연동 (장비번호/장비유형/장비명 = readonly, 드림POS 지정번호 입력 = Input) |
| **버튼** | 초기화, 적용 |
| **조회 API** | `useSomStoreExtnlConfig` → equipTypeCdList: OK이면 ['KIO','TOD'], 아니면 ['KIO'] |
| **저장 API** | `useMutationStoreExtnlConfigSave` → POST |
| **패턴** | 서버 연결(IP/Port) + 장비 매핑 |

---

### 1-2. EasyposSettingModal (EP)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `이지포스 연동설정` |
| **연동대상 코드** | EP |
| **입력 필드** | |
| - 이지포스 IP | Input, 필수 |
| - 이지포스 Port | Input, 필수 |
| - 대표 포스번호 | Input (maxLength=2), 필수 + 별도 `등록` 버튼 |
| - 대표 테이블 | Select (대표 포스번호 등록 후 활성화), 필수 |
| **테이블** | 장비연동 (장비번호/장비유형/장비명 = readonly + 정렬 가능, 이지포스 지정번호 = Input) |
| **버튼** | 연동 초기화, 적용 |
| **조회 API** | `useSomStoreEasyposInfo`, `useSomTableEasyposList` |
| **저장 API** | `useMutationEasyposSave` |
| **패턴** | 서버 연결(IP/Port) + 대표 포스/테이블 등록 + 장비 매핑 |
| **특이사항** | 대표 포스번호 등록이 별도 API 호출(extnlPosSrlNoSaveYn 구분), 상품연동 초기화 버튼 별도 존재 |

---

### 1-3. SsgposSettingModal (NW)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `신세계포스 연동설정` |
| **연동대상 코드** | NW |
| **입력 필드** | |
| - 연동 매장 ID | Input, 필수 |
| - 연동 포스번호 | Input (maxLength=4), 필수 |
| **테이블** | 없음 |
| **버튼** | 적용 (초기화 없음) |
| **조회 API** | `useSomStoreSinsegaeposInfo` |
| **저장 API** | `useMutationSinsegaeposSave` |
| **패턴** | ID 인증 + 포스번호 등록 (장비 매핑 없음, IP/Port 없음) |

---

### 1-4. ApConnectModal (AP/AD)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `아스템즈 포스 연동설정` |
| **연동대상 코드** | AP, AD |
| **입력 필드** | |
| - 아스템즈 포스 IP | Input, 필수 |
| - 아스템즈 Port | Input, 필수 |
| - 아스템즈 포인트 적립 사용여부 | Radio (사용/미사용) |
| **테이블** | 장비연동 (장비번호/장비유형/장비명 = readonly + 정렬, 아스템즈 포스 지정번호 = Input) |
| **버튼** | 연동 초기화, 적용 |
| **조회 API** | `useSomStoreExtnlConfig` |
| **저장 API** | `useMutationStoreExtnlConfigSave` |
| **패턴** | 서버 연결(IP/Port) + 옵션 설정 + 장비 매핑 |

---

### 1-5. NiceTrfdConnectModal (NT)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `NICE 택스리펀 연동설정` |
| **연동대상 코드** | NT |
| **입력 필드** | |
| - 사업자번호 | Checkbox(매장 사업자번호 사용) + Input(10자리, 숫자만) — 체크 시 Input 비활성화 |
| - 제공할 환급 유형 선택 | Checkbox 2개 (사후환급/즉시환급) |
| **테이블** | 장비연동 (장비번호/장비유형/장비명 = readonly + 정렬, NICE TID = Input) |
| **버튼** | 연동 초기화, 적용 |
| **조회 API** | `useSomStoreExtnlConfigNTInfo` |
| **저장 API** | `useMutationSomStoreExtnlConfigNTSave` |
| **패턴** | 사업자 인증 + 옵션 설정 + 장비 매핑 |

---

### 1-6. NiceCityTrfdConnectModal (RC)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `도심환급 연동설정` |
| **연동대상 코드** | RC |
| **입력 필드** | |
| - 로그인 아이디 | Input, 필수 |
| - 로그인 비밀번호 | Input, 필수 |
| - 키오스크 지점번호 | Input, 필수 |
| **테이블** | 장비연동 (장비번호/장비유형/장비명 = readonly + 정렬, 키오스크 기기번호 = Input) |
| **버튼** | 연동 초기화, 적용 |
| **조회 API** | `useSomStoreNCTRInfo` |
| **저장 API** | `useMutationNCTRSave` |
| **패턴** | ID/PW 인증 + 지점번호 + 장비 매핑 |

---

### 1-7. BcConnectModal (BC)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `페이코 스마트오더 연동설정` |
| **연동대상 코드** | BC |
| **입력 필드** | |
| - posTid (포스거래번호) | Input, 필수 |
| - orgNo (장비번호) | Input, 필수 |
| - 매장번호 (페이코 멤버십) | Input, 필수 |
| **테이블** | 장비연동 (장비번호/장비유형/장비명 = readonly, VAN pos id = Input) |
| **버튼** | 연동 초기화, 적용 |
| **조회 API** | `useSomStorePaycoInfo` |
| **저장 API** | `useMutationPaycoSave` |
| **패턴** | 거래번호/장비번호/매장번호 인증 + 장비 매핑 |
| **특이사항** | 상품연동 버튼 숨김 처리 (BC일 때 etc1 로직에서 제외) |

---

### 1-8. AllinkConnectModal (AL)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `올링크 전자영수증 연동설정` |
| **연동대상 코드** | AL |
| **입력 필드** | 없음 (장비 매핑만) |
| **테이블** | 장비연동 (장비번호/장비유형/장비명 = readonly + 정렬, POS ID = Input, 바코드 번호 = Input) |
| **버튼** | 연동 초기화, 적용 |
| **조회 API** | `useSomStoreAlllinkInfo` |
| **저장 API** | `useMutationAlllinkSave` |
| **패턴** | 장비 매핑 전용 (POS ID + 바코드 번호) |

---

### 1-9. RbKeySettingModal (RB — 로보 와이드)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `Key 입력` |
| **연동대상 코드** | RB |
| **입력 필드** | |
| - Access Key | Input, 필수 |
| - Security Key | Input, 필수 |
| - Robot ID | Input, 동적 추가 가능 (Form.List + `ID 추가` 버튼) |
| **테이블** | 없음 |
| **버튼** | 적용, 초기화 |
| **조회 API** | 없음 (부모 form에서 데이터 가져옴) |
| **저장 API** | 없음 (부모 form에 직접 setFieldValue) |
| **패턴** | API 키 인증 (Access/Security Key) + 로봇 ID 목록 |
| **특이사항** | 별도 API 없이 부모 form 데이터 직접 수정. 별도 분기 (etc3 기반이 아님) |

---

### 1-10. RbConnectModal (RG — RGT 로봇)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `로봇연동` |
| **연동대상 코드** | RG |
| **입력 필드** | Robot ID — disabled Input (서버에서 조회, 수정 불가) |
| **테이블** | 없음 |
| **버튼** | 연동 (목록이 없으면 비활성화) |
| **조회 API** | `useStmExtnlRgtRobot` |
| **저장 API** | `useMutationStmRobotConnect` |
| **패턴** | 서버 조회 후 원클릭 연동 |
| **특이사항** | 별도 분기 (etc3 기반이 아님). 사용자 입력 없이 연동만 수행. |

---

### 1-11. HwConnectModal (HW — 한화푸드테크)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `한화푸드테크 연동설정` |
| **연동대상 코드** | HW |
| **입력 필드** | 없음 |
| **테이블** | 키오스크 연동 (장비번호/제조사/장비명 = readonly, 한화푸드테크 UUID = disabled Input + 개별 발급 버튼) |
| **버튼** | UUID 전체 발급 (미발급 장비 일괄), 개별 발급 (행별) |
| **조회 API** | `useStoreDeviceList` (equipTypeCdList: ['KIO']) |
| **저장 API** | `useMutationSomStoreExtnlConfigHanwhafoodtechSave` |
| **패턴** | UUID 자동 발급형 장비 연동 |
| **특이사항** | 별도 분기 (etc3 기반이 아님). 사용자가 입력하는 값 없음, 발급만 수행. brandNo 필수. footer 없음 (버튼이 테이블 위에). |

---

### 1-12. BpayLinkModal (BP — 비플페이)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `비플페이 연동설정` |
| **연동대상 코드** | BP |
| **입력 필드 (필수 설정 탭)** | |
| - 가맹점코드 | Input, 필수 |
| - 가맹점 인증키 | Input, 필수 |
| - 가맹점 암호화 인증키 | Input, 필수 |
| - 매장 분류(Category) | Select (공통코드 PAY_STORE_CLASS_CD), 필수 |
| **입력 필드 (추가 설정 탭)** | |
| - 하위가맹점 코드입력 | 판매 카테고리명(readonly) + 하위가맹점 코드(Input) 테이블 |
| **탭** | 필수 설정 / 추가 설정 |
| **버튼** | 초기화, 적용 |
| **조회 API** | `useBcMbrExtnlItlokBpPay` |
| **저장 API** | `useBcMbrExtnlItlokBpPaySave` |
| **패턴** | API 키 인증 (가맹점코드/인증키/암호화키) + 카테고리 매핑 |
| **특이사항** | 별도 분기 (etc3 기반이 아님). 탭 구조. 하위가맹점 코드 매핑 기능. |

---

### 1-13. MealKingSettingModal (MK — 식권대장)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `식권대장 연동설정` |
| **연동대상 코드** | MK |
| **입력 필드** | |
| - client-id (클라이언트 아이디) | Input, 필수 |
| - client-secret (클라이언트 시크릿 키) | Input (maxLength=512), 필수 |
| **테이블** | 없음 |
| **버튼** | 적용 (초기화 없음) |
| **조회 API** | `useSomStoreMealKingInfo` |
| **저장 API** | `useMutationMealKingSave` |
| **패턴** | API 키 인증 (Client ID / Client Secret) |

---

### 1-14. KoreaPrepayConnectModal (KP — 한국선불카드)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `한국선불카드 연동설정` |
| **연동대상 코드** | KP |
| **입력 필드** | |
| - merchant-id (상점 아이디) | Input, 필수 |
| - X-AUTH-ID (상점 API 인증 아이디) | Input, 필수 |
| - X-AUTH-KEY (상점 API 인증 키) | Input (maxLength=512), 필수 |
| - Product-id (계좌상품 아이디) | Input, 필수 |
| - 카드 Prefix | Input (maxLength=10), 필수 |
| **테이블** | 없음 |
| **버튼** | 적용 (초기화 없음) |
| **조회 API** | `useSomStoreKoreaPrepayInfo` |
| **저장 API** | `useMutationKoreaPrepaySave` |
| **패턴** | API 키 인증 (상점 ID / AUTH ID / AUTH KEY + 추가 식별값) |

---

### 1-15. JimmyjohnsSettingModal (JJ — 지미존스)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `지미존스 연동설정` |
| **연동대상 코드** | JJ |
| **입력 필드** | |
| - 외부앱 자동주문접수 설정 | Switch (on/off) |
| - 포장 > 픽업요청시간 | Select (1분/5분/10~90분) — 자동주문접수 활성화 시만 선택 가능 |
| **테이블** | 포장 테이블 (Form.List, 픽업요청시간 Select) |
| **버튼** | 적용 |
| **조회 API** | `useSomStoreExtnlConfigJimmyjohnsInfo` |
| **저장 API** | `useMutationSomStoreExtnlConfigJimmyjohnsSave` |
| **패턴** | 주문 운영 설정 (자동접수 + 픽업시간) |
| **특이사항** | IP/Port, 키 입력 없음. 운영 정책 설정만. |

---

### 1-16. BizplayHitplusSettingModal (BH — 비즈플레이 히트플러스)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `비즈플레이(히트플러스) 연동설정` |
| **연동대상 코드** | BH |
| **입력 필드** | |
| - 가맹점 코드 | Input, 필수 |
| - 가맹점 인증키 | Input (maxLength=512), 필수 |
| - 가맹점 암호화 인증키 | Input, 필수 |
| - 포장주문 자동접수 설정 | Switch + 픽업요청시간 Select |
| - 배달주문 자동접수 설정 | Switch + 예상소요시간 Select |
| **테이블** | 없음 |
| **버튼** | 적용 |
| **조회 API** | `useSomStoreExtnlConfigBizplayHitplusInfo` |
| **저장 API** | `useMutationSomStoreExtnlConfigBizplayHitplusSave` |
| **패턴** | API 키 인증 + 주문 운영 설정 (혼합형) |

---

### 1-17. HyundaiRobotSettingModal (HB — 현대로보틱스 배송로봇)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `현대로보틱스(배송로봇) 연동설정` |
| **연동대상 코드** | HB |
| **입력 필드** | |
| - Delivery Key(배송 연동 키) | Input, 필수 |
| **테이블** | 없음 |
| **버튼** | 적용 |
| **조회 API** | `useSomStoreHyundaiRobotInfo` |
| **저장 API** | `useMutationHyundaiRobotSave` |
| **패턴** | 토큰 인증 (단일 키) |

---

### 1-18. CosmoCupDptSettingModal (CS — COSMO 컵보증금)

| 항목 | 내용 |
|------|------|
| **모달 제목** | `COSMO 컵보증금 연동설정` |
| **연동대상 코드** | CS |
| **입력 필드** | |
| - Client-Id | Input, 필수 |
| - Client-Secret | Input, 필수 |
| - 매장 연동 정보 (컵보증금 유형 01/02/03) | Input, 선택 |
| **테이블** | 없음 |
| **버튼** | 적용 |
| **조회 API** | `useSomStoreExtnlConfigCosmoCupDepositInfo` |
| **저장 API** | `useMutationSomStoreExtnlConfigCosmoCupDepositSave` |
| **패턴** | API 키 인증 (Client ID / Client Secret) + 유형 코드 |

---

## 2. 연동 패턴 분류

### 패턴 A: 서버 연결형 (IP/Port 기반)
- **해당 모달**: LinkSettingModal(DP/DK/OK), EasyposSettingModal(EP), ApConnectModal(AP/AD)
- **특징**: 매장 POS 서버에 직접 연결. IP + Port 입력 필수. 장비 매핑 테이블 포함.
- **적합도**: T-order는 서버 to 서버(HTTPS) 연동이므로 IP/Port 직접 입력은 **부적합**

### 패턴 B: API 키 인증형 (Access Key / Secret Key)
- **해당 모달**: RbKeySettingModal(RB), MealKingSettingModal(MK), KoreaPrepayConnectModal(KP), CosmoCupDptSettingModal(CS)
- **특징**: 외부 서비스 인증용 키 입력. IP/Port 없음. 장비 매핑 없음(대부분).
- **적합도**: T-order API가 api-key 인증이므로 **가장 적합한 기본 패턴**

### 패턴 C: 가맹점 인증형 (가맹점코드 + 인증키 + 암호화키)
- **해당 모달**: BpayLinkModal(BP), BizplayHitplusSettingModal(BH)
- **특징**: 가맹점 코드 + 인증키 + 암호화 인증키 세트. 주문 운영 설정 포함 가능.
- **적합도**: T-order 명세서에 api-key 단일 인증이라 **과다**

### 패턴 D: 장비 매핑형
- **해당 모달**: AllinkConnectModal(AL), HwConnectModal(HW)
- **특징**: 장비(키오스크 등)별 ID 매핑이 핵심. 인증 정보 없거나 자동 발급.
- **적합도**: T-order는 장비별 매핑 불필요 (서버 to 서버). **부적합**

### 패턴 E: 주문 운영 설정형
- **해당 모달**: JimmyjohnsSettingModal(JJ), BizplayHitplusSettingModal(BH 일부)
- **특징**: 자동주문접수, 픽업요청시간 등 운영 정책 설정.
- **적합도**: T-order에서 주문/매출 자동 처리 관련 설정이 필요하다면 **부분 참고 가능**

### 패턴 F: ID/PW 인증형
- **해당 모달**: NiceCityTrfdConnectModal(RC), SsgposSettingModal(NW)
- **특징**: 로그인 아이디/비밀번호 또는 연동 매장 ID + 포스번호.
- **적합도**: T-order는 api-key 인증이므로 **부적합**

---

## 3. T-order 연동설정 모달 기획 제안

### 3-1. 참고 모달 추천

| 우선순위 | 참고 대상 | 이유 |
|---------|----------|------|
| 1순위 | **MealKingSettingModal (MK)** | API 키 인증형(Client ID/Secret), 깔끔한 구조, 장비 매핑 없음 |
| 2순위 | **CosmoCupDptSettingModal (CS)** | Client-Id/Secret + 추가 설정값(유형 코드) 패턴 |
| 3순위 | **BizplayHitplusSettingModal (BH)** | API 키 + 운영 설정(자동접수) 혼합 패턴 — 매출 자동 처리 설정이 필요할 경우 참고 |

### 3-2. 연동설정 모달 구성 제안

```
모달 제목: "T-order 연동설정"
모달 너비: 580px (기존 패턴 동일)
```

#### 필수 설정 영역

| 필드명 | 타입 | 필수 | 설명 | 근거 |
|--------|------|------|------|------|
| API Key | Input | Y | T-order api-key 인증값 | API 명세서: api-key 헤더 인증 |
| 연동 서버 URL | Input 또는 Select | Y | 개발서버/운영서버 구분 | 명세서: 개발 https://api.middleware.torder.tech/event/v1/partners |
| 매장 식별 코드 | Input | Y | T-order 측에서 부여한 매장 코드 | 서버 to 서버 연동 시 매장 식별 필요 |

#### 매출 연동 설정 영역 (선택 - 개발팀 협의 필요)

| 필드명 | 타입 | 필수 | 설명 | 근거 |
|--------|------|------|------|------|
| 마감 시 자동개점 안내 | Checkbox 또는 Info 텍스트 | - | "마감된 상태에서 주문 인입 시 당일자로 자동개점되면서 매출적재" 안내 | 이상환님 요구사항 |

> **참고**: 매장 개점/마감 연동은 이상환님 요청으로 **제외**. 다만 마감 상태에서 주문 인입 시 자동개점+매출적재 동작은 **서버 로직**이므로, 모달에서는 이 동작에 대한 안내 문구만 표시하면 됨.

#### 이벤트 전달 대상 설정 (개발팀 협의 필요)

T-order 이벤트 API 명세서에 따르면 비버 포스에서 T-order로 전달하는 이벤트가 8종이나 있음.
이 중 매장 운영에 따라 on/off 하거나 설정이 필요한 항목이 있다면 모달에 포함.

| 이벤트 | 코드 | 모달 포함 여부 | 비고 |
|--------|------|---------------|------|
| 포스 시작/종료 | P0101/P0102 | X | 자동 전달 (설정 불필요) |
| 테이블 정보 변경 | P0201 | X | 자동 전달 |
| 상품 그룹 변경 | P0301 | **별도 버튼** | 이상환님: "별도 버튼으로 진행" |
| 상품 정보 변경 | P0302 | **별도 버튼** | 이상환님: "별도 버튼으로 진행" |
| 주문서 변경 | P0401 | X | 자동 전달 |
| 테이블 정리 | P0402 | X | 자동 전달 |
| 결제완료 | P0501 | X | 자동 전달 (매출 연동) |

#### 버튼 구성

| 버튼 | 위치 | 동작 |
|------|------|------|
| 적용 | footer 우측 | 연동 설정 저장 |
| 초기화 | footer 좌측 (선택) | 입력값 리셋 |

### 3-3. 상품연동 버튼 (외부연동 현황 테이블 내)

기존 `상품연동` 버튼의 위치와 별개로, 이상환님이 **"별도 버튼"**을 요구함.

**기존 상품연동 버튼 동작 분석**:
- `useMutationStmExtnlItlokProduct` 호출
- 엔드포인트: `POST /bw/stm/extnl/itlok/product`
- 요청: `{ extnlItlokNo }` (외부연동번호만 전달)
- 응답: `prodItlokStusCd` (A=진행중, D=완료, F=실패)
- UI: 디바운스 700ms 적용. 진행중이면 loading 메시지, 실패면 error, 성공이면 success + refetch

**이상환님 언급**: "기존 다른 상품 i/f 연동 진행 시 매장관리 우측 상단에 사용자 선택 시 연동설정 버튼 존재함"

**해석 및 제안**:
1. 기존 `상품연동` 버튼은 공통코드 `etc1 === 'Y'`일 때 외부연동 현황 테이블 내 해당 row에 표시됨
2. T-order의 상품정보 변경 callback은 기존 상품연동과 **다른 방향** — 기존은 비버→외부 상품 동기화, T-order callback은 비버→T-order 서버로 변경 이벤트 전달
3. **"별도 버튼"의 두 가지 해석**:
   - (a) 기존 상품연동 버튼과 같은 위치에 "T-order 상품 전송" 버튼 추가 → `etc1 = 'Y'`로 설정하되 호출 API가 T-order 전용
   - (b) 연동설정 모달 내부에 "상품정보 전송" 버튼 배치 → P0301/P0302 이벤트 수동 발행
4. **추천**: 이상환님이 "매장관리 우측 상단에 연동설정 버튼 존재"를 언급한 것으로 보아, **기존 패턴(etc3 기반 연동설정 버튼)과 동일한 위치**에 버튼을 두되, 클릭 시 T-order 상품 callback API 호출이 적합. 즉 etc3='Y'로 연동설정 모달을 열고, 모달 안에서 상품 전송 기능을 제공하거나, etc1='Y'로 기존 상품연동 버튼 위치에 별도 표시.

> **개발팀 협의 포인트**: 기존 `useMutationStmExtnlItlokProduct`를 재사용할 수 있는지, T-order 전용 API가 필요한지 백엔드와 확인 필요.

---

## 4. 상품연동 callback 처리 방식

### 4-1. 기존 상품연동 버튼 동작 흐름

```
[외부연동 현황 테이블]
  └─ 상품연동 버튼 클릭 (etc1='Y'인 연동대상만 노출)
       └─ useMutationStmExtnlItlokProduct 호출
            └─ POST /bw/stm/extnl/itlok/product
                 └─ { extnlItlokNo: number }
                      └─ 응답: prodItlokStusCd (A/D/F)
```

- 버튼 클릭 → 서버에서 비동기 상품 연동 시작
- 상태: A(진행중) → D(완료) 또는 F(실패)
- 연동상태 컬럼에서 Tooltip으로 최근 연동요청일시/완료일시 확인 가능
- 포스마스터 일반매장/프랜차이즈(P2/P4)는 상품연동 버튼 숨김

### 4-2. T-order 상품 callback과의 차이점

| 구분 | 기존 상품연동 | T-order 상품 callback |
|------|-------------|----------------------|
| **방향** | 비버 → 외부 POS (상품 데이터 동기화) | 비버 포스 → T-order 서버 (이벤트 알림) |
| **통신** | 비버 백엔드 내부 처리 | HTTPS POST, JSON, api-key 인증 |
| **트리거** | 사용자가 버튼 클릭 | (1) 상품 변경 시 자동 1000ms 이내 또는 (2) 별도 버튼 |
| **페이로드** | extnlItlokNo만 전달 | P0301(상품그룹)/P0302(상품정보) 이벤트 JSON |
| **결과** | 비동기(A/D/F 상태 추적) | T-order 서버 응답으로 즉시 확인 |

### 4-3. "별도 버튼"이 기존 상품연동 버튼과 같은 패턴인지

**결론: 같은 위치지만 다른 동작이다.**

- **위치는 동일**: etc1='Y' 기반으로 외부연동 현황 테이블 row에 버튼 표시
- **동작은 다름**: 기존 `useMutationStmExtnlItlokProduct`가 아니라 T-order 이벤트 API(P0301/P0302)를 호출하는 전용 API가 필요
- **이상환님 의도**: 상품정보 변경 시 자동 callback 외에, 운영자가 수동으로 "지금 T-order에 상품정보 보내" 할 수 있는 버튼

### 4-4. 이지포스(EP) 상품연동 초기화와의 비교

이지포스는 `상품연동` 버튼 + `상품연동 초기화` 버튼이 함께 존재:
- 상품연동: `useMutationStmExtnlItlokProduct` (범용)
- 상품연동 초기화: `useStmExtnlItlokEasyposInit` (이지포스 전용)

T-order도 유사하게:
- 상품연동 버튼: T-order 전용 API (P0301/P0302 이벤트 수동 발행)
- 필요 시 상품연동 초기화: T-order 전용 API (전체 상품정보 재전송)

---

## 5. StoreInterfaceCard 분기 구조 전체 맵

### etc3 기반 연동설정 버튼 분기 (외부연동 현황 테이블 내)

| 코드 | 연동대상명 | 모달 | etc3 |
|------|----------|------|------|
| DP | 드림하이테크(일반) | LinkSettingModal | Y |
| DK | 드림하이테크(키오스크) | LinkSettingModal | Y |
| OK | OK POS | LinkSettingModal | Y |
| NW | 신세계포스 | SsgposSettingModal | Y |
| EP | 이지포스 | EasyposSettingModal | Y |
| AP | 아스템즈 포스 | ApConnectModal | Y |
| AD | 아스템즈 포스(별도코드) | ApConnectModal | Y |
| NT | NICE 택스리펀 | NiceTrfdConnectModal | Y |
| RC | NICE 도심환급 | NiceCityTrfdConnectModal | Y |
| BC | 페이코 스마트오더 | BcConnectModal | Y |
| AL | 올링크 전자영수증 | AllinkConnectModal | Y |
| MK | 식권대장 | MealKingSettingModal | Y |
| KP | 한국선불카드 | KoreaPrepayConnectModal | Y |
| JJ | 지미존스 | JimmyjohnsSettingModal | Y |
| BH | 비즈플레이(히트플러스) | BizplayHitplusSettingModal | Y |
| HB | 현대로보틱스(배송로봇) | HyundaiRobotSettingModal | Y |
| CS | COSMO 컵보증금 | CosmoCupDptSettingModal | Y |

### 별도 분기 (etc3와 무관)

| 코드 | 연동대상명 | 모달 | 비고 |
|------|----------|------|------|
| RB | 로보 와이드 | RbKeySettingModal | "Key 입력" 버튼으로 분기 |
| RG | RGT 로봇 | RbConnectModal | "로봇연동" 버튼으로 분기 |
| HW | 한화푸드테크 | HwConnectModal | "연동설정" 버튼으로 분기 |
| BP | 비플페이 | BpayLinkModal | "연동설정" 버튼으로 분기 |

### 미등록 코드 (버튼 미표시)

793줄 `else { return <></> }` — 위에 해당하지 않는 모든 코드는 빈 렌더링.
**T-order는 현재 여기에 해당** (외부연동번호 11403으로 등록됐으나 코드 분기 없음).

---

## 6. T-order 연동 추가를 위한 개발 체크리스트 (기획 관점)

### 백오피스 프론트엔드

1. **공통코드 설정 확인**
   - `EXTNL_ITLOK_TGT_CD`에 T-order 코드(예: 'TO') 추가 여부
   - etc1(상품연동 버튼): 'Y' → 상품 callback 수동 전송용 버튼
   - etc3(연동설정 버튼): 'Y' → 연동설정 모달 진입용 버튼

2. **새 모달 파일 생성**
   - `TorderSettingModal.tsx` (MealKingSettingModal 패턴 참고)
   - 입력: API Key, 연동 서버 URL, 매장 식별 코드

3. **StoreInterfaceCard.tsx 수정**
   - state 추가: `isTorderConnectModalOpen`
   - etc3 기반 분기에 T-order 코드 조건 추가
   - 상품연동 버튼: T-order 전용 API 호출 분기 추가 (기존 `useMutationStmExtnlItlokProduct`와 다른 로직)
   - 모달 인스턴스 추가

4. **API 훅 생성**
   - 조회: `useSomStoreTorderInfo` (또는 기존 범용 API 재사용 가능 여부 확인)
   - 저장: `useMutationTorderSave`
   - 상품 callback: 전용 mutation 훅 (P0301/P0302 이벤트 발행)

### 백엔드 (개발팀 협의 필요)

1. T-order 연동설정 조회/저장 API
2. T-order 상품 callback API (P0301/P0302 수동 발행)
3. 마감 상태 주문 인입 시 자동개점 + 매출적재 로직
4. T-order 이벤트 API 연동 서버 구현 (HTTPS POST, api-key 인증)

---

## 7. 개발팀 미팅 시 확인 사항

1. T-order 연동대상 코드는 무엇으로 할 것인가? (현재 외부연동번호 11403으로 DB 등록 확인 필요)
2. etc1/etc3 값은 어떻게 설정할 것인가?
3. 기존 `useMutationStmExtnlItlokProduct` 범용 상품연동 API를 T-order에도 쓸 수 있는가, 전용 API가 필요한가?
4. T-order 이벤트 API(P0301/P0302) 수동 발행은 프론트 → 비버 백엔드 → T-order 서버 구조인가?
5. 연동설정 저장 시 기존 범용 API(`useSomStoreExtnlConfig` 계열)를 재사용할 수 있는가?
6. 마감 상태 자동개점 로직은 포스 단에서 처리하는가, 서버 단에서 처리하는가?
7. 상품정보 자동 callback(변경 후 1000ms)은 포스 로직인가 서버 로직인가?

---

> 작성기준: 코드 실독 기반. 추측 없음. 모든 모달 파일 + API 훅 전수 확인 완료.
