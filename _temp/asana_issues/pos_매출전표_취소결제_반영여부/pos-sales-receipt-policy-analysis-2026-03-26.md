# POS 매출전표 - 당일 취소결제 반영여부 토글 추가를 위한 코드 분석

## 분석 일자: 2026-03-26

---

## 1. StorePolicyCard.tsx 전체 구조

파일 위치: `/Users/beaver_bin/Documents/dev/bw_frontend_backoffice/src/pages/Store/Management/StoreSetting/StorePolicyCard.tsx`

### 1-1. Collapse 섹션 구성 (총 4개 + 조건부 2개)

| 순서 | 섹션명 | 설명 |
|------|--------|------|
| 1 | **상품 정책 설정** | 품절상품표시, 상품상세보기, 바코드상품 재고관리, 일일 판매 제한, 레시피 출력, 원산지 표기 등 |
| 2 | **모바일상품권 설정** | 상품교환권→금액권 사용, 금액권 처리 정책, 업체별 상세설정 테이블 |
| 3 | **대기번호 채번 설정** | 통합/장비별/카테고리별 대기번호 채번 |
| 4 | **기타 정책 설정** | 다국어, 진동벨, 인원수 체크, 간편비밀번호, 옵션상품 통합출력, 주방프린터, 직원호출, 전자영수증, SNS 링크 |
| 조건부 | **직원호출카드 설정** | csCallFncYn === 'Y'일 때만 노출 |
| 조건부 | **직원호출 출력장비 설정** | paperPrtUseYn일 때만 노출 |

### 1-2. 각 항목의 UI 패턴

| 패턴 | 사용 항목 예시 |
|------|---------------|
| **Radio.Group (사용/미사용)** | 품절상품표시, 상품상세보기, 바코드상품 재고관리, 일일판매제한, 레시피출력, 진동벨, 인원수체크, 옵션상품통합출력, 전자영수증, SNS링크, 직원호출 |
| **Radio.Group (커스텀 옵션)** | 품절상품배치(위치고정/하단이동), 대기번호채번(통합/장비별/카테고리별), 주방프린터출력시점(공통코드) |
| **Checkbox.Group** | 노출 다국어 선택 |
| **Checkbox** | 직원호출 안내설정(알림팝업, 종이출력) |
| **Select** | 기프티콘 업체명 |
| **Input.TextArea** | 원산지 표기 |
| **Button** | 간편비밀번호 설정, 포장비부과설정, 링크설정 |

---

## 2. 기존 라디오 버튼 구현 패턴 (새 항목 추가 시 참고)

### 2-1. 가장 기본적인 패턴 (진동벨, 인원수 체크 등)

"기타 정책 설정" 섹션 내부의 가장 단순한 라디오 버튼 패턴:

```tsx
// 위치: 약 2088~2105 라인
<FlexRow>
  <Col span={5}>
    <Typography.Text>진동벨 사용여부</Typography.Text>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={['filteredStorePolicyMap', 'VB']}>
      <Radio.Group options={yesNo} />
    </Form.Item>
  </Col>
  <Col span={5}>
    <Typography.Text>인원수 체크 기능</Typography.Text>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={['filteredStorePolicyMap', 'CP']}>
      <Radio.Group options={yesNo} />
    </Form.Item>
  </Col>
</FlexRow>
<Divider />
```

**핵심 포인트:**
- 레이아웃: `FlexRow` > `Col span={5}` (라벨) + `Col span={7}` (입력) 반복 (한 줄에 2개 항목)
- Form.Item: `noStyle` 속성, `name`은 `['filteredStorePolicyMap', '정책코드']` 형태
- Radio.Group: `options={yesNo}` → 사용(Y)/미사용(N)
- 항목 사이: `<Divider />`로 구분

### 2-2. 툴팁이 있는 패턴 (옵션상품 통합출력, 전자영수증 등)

```tsx
// 위치: 약 2152~2218 라인
<FlexRow>
  <Col span={5}>
    <Space style={{ paddingRight: 20 }}>
      옵션상품 통합출력여부
      <InfoTooltip
        tooltip={`설명 텍스트`}
        overlayStyle={{ minWidth: 'max-content' }}
        overlayInnerStyle={{ whiteSpace: 'pre-wrap' }}
      />
    </Space>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={['filteredStorePolicyMap', 'OP']}>
      <Radio.Group options={yesNo} />
    </Form.Item>
  </Col>
  ...
</FlexRow>
```

### 2-3. yesNo 옵션 상수

```tsx
const yesNo = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
]
```

### 2-4. "반영/미반영" 옵션이 필요한 경우

기존에는 "사용/미사용"만 있으므로, 새 항목에서 "반영(Y)/미반영(N)" 라벨이 필요하면 별도 옵션 배열을 만들어야 한다:

```tsx
// 새로 추가 필요
const applyYesNo = [
  { label: '반영', value: 'Y' },
  { label: '미반영', value: 'N' },
]
```

---

## 3. Form 데이터 구조

### 3-1. 정책값 저장 구조

- **Form 타입**: `StoreDetailFormData` (StoreSetting.tsx에서 정의)
- **정책 맵 필드**: `filteredStorePolicyMap?: { [key: string]: string }`
  - 키: 2글자 정책 코드 (예: SD, TD, BV, DS, PR, ML, VB, CP, OP, ER 등)
  - 값: 'Y' 또는 'N' (문자열)

### 3-2. 현재 사용 중인 정책 코드 목록

| 코드 | 항목명 | 섹션 |
|------|--------|------|
| SD | 품절상품표시여부 | 상품 정책 |
| TD | 상품상세보기표시여부 | 상품 정책 |
| SL | 품절상품의 배치 | 상품 정책 (조건부) |
| BV | 바코드상품 재고관리 사용여부 | 상품 정책 |
| DS | 일일 판매 제한 설정 | 상품 정책 |
| PR | 레시피 출력 여부 | 상품 정책 |
| ML | 다국어 노출 여부 | 기타 정책 |
| VB | 진동벨 사용여부 | 기타 정책 |
| CP | 인원수 체크 기능 | 기타 정책 |
| OP | 옵션상품 통합출력여부 | 기타 정책 |
| ER | 전자영수증 사용여부 | 기타 정책 |

### 3-3. 서버 응답 → Form 변환 흐름

1. API 조회 응답: `resp.storePolicyList` (배열, `StorePolicyInfoData[]`)
2. 기프티콘 관련 코드(GT, GC, GB, GK, GD, GS) 필터링 제외
3. 나머지를 `filteredStorePolicyMap`으로 변환: `{ [storePolicyCd]: storePolicyVal }`
4. Form에 세팅: `form.setFieldsValue({ filteredStorePolicyMap })`

### 3-4. StorePolicyInfoData 타입 (서버 데이터 모델)

```typescript
// backend.ts에서 정의
export interface StorePolicyInfoData {
  modifyPosbYn?: string       // 수정가능여부
  policyValTypeCd: string     // 정책_값_유형_코드(A:여부, B:비율)
  storePolicyCd: string       // 상점_정책_코드 (2글자)
  storePolicyNm: string       // 상점_정책_명
  storePolicyVal: string      // 상점_정책_값 (Y/N)
}
```

---

## 4. API 연동 방식

### 4-1. 조회 (GET)

- **훅**: `useSomStoreControllerStoreDetail`
- **엔드포인트**: 상점 상세 조회
- **응답에서 정책**: `resp.storePolicyList` → `StorePolicyInfoData[]`
- **변환**: 프론트에서 배열을 맵으로 변환하여 Form에 바인딩

### 4-2. 저장 (POST)

- **저장 시점**: StoreSetting.tsx의 Form onFinish 핸들러 (약 674~718 라인)
- **변환 로직**:
  ```
  1. values.filteredStorePolicyMap 가져옴
  2. 원본 storeDetailData.storePolicyList를 순회
  3. 각 항목의 storePolicyVal을 filteredStorePolicyMap의 값으로 업데이트
  4. 기프티콘 코드 필터링 후 gifticonPolicyList와 합쳐서 저장
  ```
- **저장 API**: `useMutationStoreSave` (매장 전체 저장에 포함)
- **별도 정책 변경 API**: `useMutationSomStorePolicyChange` → `POST:/bw/som/store/policy/change`
  - 요청 모델: `StorePolicyReqModel { storeNo, storePolicyInfoList }`

### 4-3. 저장 시 핵심 코드 (StoreSetting.tsx 711~718 라인)

```typescript
const newStorePolicyList = storeDetailData?.storePolicyList
  ?.map((item) => ({
    ...item,
    storePolicyVal: filteredStorePolicyMap?.[item.storePolicyCd] ?? item.storePolicyVal,
  }))
  .filter((v) => !gifticonPolicyCdList.includes(v.storePolicyCd ?? ''))
```

**중요**: 이 로직은 `storeDetailData.storePolicyList` (서버에서 내려온 원본 배열)을 기반으로 순회하면서 `filteredStorePolicyMap`의 값으로 덮어쓴다. 따라서 **서버에 해당 정책 코드가 이미 존재해야** 프론트에서 저장이 가능하다.

---

## 5. 새 항목 추가 시 영향 범위

### 5-1. 서버(백엔드) 선행 작업

- `storePolicyList`에 새 정책 코드를 추가해야 함 (예: 코드 2글자, 가칭 `CR` 또는 다른 코드)
- DB의 정책 마스터 테이블에 레코드 추가
- Default 값: 'N' (미반영)

### 5-2. 프론트엔드 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| **StorePolicyCard.tsx** | "기타 정책 설정" 섹션에 라디오 버튼 행 추가 |

### 5-3. StorePolicyCard.tsx 구체적 변경 사항

**1) 옵션 상수 추가 (파일 상단, 약 97~106 라인 근처)**

```tsx
const applyYesNo = [
  { label: '반영', value: 'Y' },
  { label: '미반영', value: 'N' },
]
```

**2) "기타 정책 설정" Collapse 내부에 FlexRow 추가**

추가 위치 후보:
- 전자영수증(ER) 행 아래, SNS 링크 행 위 (약 2219~2251 라인 사이)
- 또는 기타 정책 설정 섹션 마지막 (약 2276 라인의 빈 FlexRow 근처)

```tsx
<FlexRow>
  <Col span={5}>
    <Space style={{ paddingRight: 20 }}>
      POS 매출전표 당일 취소결제 반영여부
      <InfoTooltip
        tooltip={`POS 매출전표에서 결제일자와 취소일자가 다른 경우,\n당일 취소결제 내역의 반영 여부를 설정합니다.`}
        overlayStyle={{ minWidth: 'max-content' }}
        overlayInnerStyle={{ whiteSpace: 'pre-wrap' }}
      />
    </Space>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={['filteredStorePolicyMap', '{정책코드}']}>
      <Radio.Group options={applyYesNo} />
    </Form.Item>
  </Col>
  <Col span={5}></Col>
  <Col span={7}></Col>
</FlexRow>
<Divider />
```

### 5-4. 추가 변경 불필요한 부분

- **StoreSetting.tsx**: 변경 불필요. 저장 로직이 `filteredStorePolicyMap`을 자동으로 원본 `storePolicyList`에 매핑하므로, 새 정책 코드가 서버에서 내려오기만 하면 자동으로 저장됨
- **타입 파일**: 변경 불필요. `filteredStorePolicyMap`이 `{ [key: string]: string }` 동적 타입이므로 새 키 추가에 타입 변경 필요 없음
- **API 훅**: 변경 불필요. 기존 매장 저장 API에 포함되어 처리됨

### 5-5. 확인 필요 사항 (백엔드 협의)

1. **정책 코드**: 2글자 코드 결정 (예: `CR`, `SC` 등) - 백엔드와 협의 필요
2. **policyValTypeCd**: 'A' (여부 타입)로 설정
3. **기본값**: 'N' (미반영)
4. **삼성서울병원/드림하이테크**: 기존 매장에 대해 'Y'로 일괄 업데이트 필요 여부

---

## 6. 요약

| 항목 | 내용 |
|------|------|
| **추가 위치** | StorePolicyCard.tsx > "기타 정책 설정" Collapse > 기존 항목 아래 |
| **UI 패턴** | Radio.Group + 반영/미반영 옵션 (기존 yesNo 패턴과 동일 구조) |
| **Form 필드** | `['filteredStorePolicyMap', '{정책코드}']` |
| **저장 방식** | 기존 매장 저장 로직에 자동 포함 (추가 코드 불필요) |
| **프론트 변경 범위** | StorePolicyCard.tsx 1개 파일 (옵션 상수 + FlexRow 추가) |
| **백엔드 선행** | 정책 코드 신규 등록, DB 마스터 데이터 추가 |
