# StorePolicyCard.tsx UI 구조 완전 분석 + spec_회원유형_개선_v2.html 형식 분석

작성일: 2026-03-26
분석 대상:
- `/Users/beaver_bin/Documents/dev/bw_frontend_backoffice/src/pages/Store/Management/StoreSetting/StorePolicyCard.tsx`
- `/Users/beaver_bin/Documents/dev/bw_frontend_backoffice/src/pages/Store/Management/StoreSetting/StoreSetting.tsx`
- `/Users/beaver_bin/Documents/manual_automation/manual_builder_stg/docs/specs/spec_회원유형_개선_v2.html`
- 관련 스타일/컴포넌트 파일 일체

---

## 1. StorePolicyCard.tsx 전체 구조

### 1-1. 파일 개요

- **경로**: `src/pages/Store/Management/StoreSetting/StorePolicyCard.tsx`
- **총 라인**: 약 2768줄
- **용도**: 매장설정 > 매장 운영설정 페이지에서 "정책 설정" 영역을 담당하는 컴포넌트
- **Form 연동**: 부모 `StoreSetting.tsx`에서 `Form.useFormInstance<StoreDetailFormData>()`로 폼 인스턴스를 공유받음

### 1-2. Props

```typescript
type props = {
  storeDeviceList?: EquipListResModel
  userNo?: string                    // 비밀번호 변경용 대표자 userNo
  giftvchrSettList?: GiftvchrSettData[]
  brandPackAmtSettData?: PackAmtSettData
  storeNo: number
  isBrand?: boolean
  prodPolicyOperCd?: string
  callData: MsgCardListModel | undefined
  callCardList: MsgCardListData[]
  setCallCardList: React.Dispatch<React.SetStateAction<MsgCardListData[]>>
  cupDptSettData?: CupDptSettData
}
```

### 1-3. 주요 Form.useWatch 필드

| 필드 경로 | 변수명 | 용도 |
|-----------|--------|------|
| `['data', 'storeAutoClosYn']` | storeAutoClosYn | 브랜드 자동마감 허용 여부 |
| `['data', 'autoClosYn']` | autoClosYn | 자동마감 여부 (Y/N/A) |
| `['data', 'autoClosTm']` | autoClosTm | 자동마감 시간 |
| `['data', 'waitNoIntgYn']` | waitNoIntgYn | 대기번호 채번 방식 (Y/N/C) |
| `['data', 'brandNo']` | brandNo | 브랜드 번호 |
| `['filteredStorePolicyMap', 'SD']` | showSoldoutProdYn | 품절상품표시여부 |
| `['filteredStorePolicyMap', 'BV']` | bvYn | 바코드상품 재고관리 |
| `['filteredStorePolicyMap', 'ML']` | (직접 watch) | 다국어 노출 여부 |
| `['data', 'csCallFncYn']` | csCallFncYn | 직원호출 기능 |
| `['data', 'waitNoProdYn']` | waitNoProdYn | 주문상품별 대기번호 채번 |
| `['data', 'waitNoAutoYn']` | waitNoAutoYn | 번호 영역 자동/수동 |
| `['data', 'snsLinkUseYn']` | snsLinkUseYn | SNS 링크 설정 |
| `['data', 'cupDptUseYn']` | cupDptUseYn | 컵보증금 사용여부 |
| `'indiLangList'` | selectedLangs | 선택된 다국어 목록 |
| `'waitNoModifyYn'` | waitNoModifyYn | 대기번호 수정 가능 여부 |
| `'hdayUseYn'` | hdayUseYn | 휴무일 설정 |
| `'packamtYn'` | packamtYn | 포장비 사용여부 |
| `'paperPrtUseYn'` | paperPrtUseYn | 종이출력 여부 |

### 1-4. 상수 정의

```typescript
const yesNo = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
]

const waitOption = [
  { label: '통합', value: 'Y' },
  { label: '장비별', value: 'N' },
  { label: '카테고리별', value: 'C' },
]
```

---

## 2. Collapse 패널 전체 목록 (순서대로)

전체 return문 구조: `<Space direction="vertical" size={20}>` 안에 여러 `<Collapse>` 블록이 나열됨.

### 패널 1: 상품 정책 설정 (라인 746~910)

```
<Collapse defaultActiveKey={['1']} expandIcon={...} style={{ backgroundColor: Colors.White }} expandIconPosition={'end'}>
  <Collapse.Panel key={'1'} header={`상품 정책 설정`} className={storeSettingStyles.collapsePanel}>
```

**내부 항목 (순서):**

| 순서 | FlexRow/구분 | 좌측 Col span | 좌측 라벨 | 좌측 컴포넌트 | 우측 Col offset+span | 우측 라벨 | 우측 컴포넌트 |
|------|-------------|--------------|----------|--------------|---------------------|----------|--------------|
| 1 | FlexRow | span=5 | 품절상품표시여부 (Required) | Radio.Group `['filteredStorePolicyMap', 'SD']` options=yesNo, span=7 | offset=1, span=4 | 상품상세보기표시여부 (Required) | Radio.Group `['filteredStorePolicyMap', 'TD']` options=yesNo, span=7 |
| - | Divider | (조건부: showSoldoutProdYn !== 'Y'일 때 단순 Divider) | | | | | |
| 1-1 | **조건부** (showSoldoutProdYn === 'Y') StyledCol 안 FlexRow | span=5 | 품절상품의 배치 (Required) | Radio.Group `['filteredStorePolicyMap', 'SL']` options=[위치고정/하단이동], span=7 | - | - | - |
| - | Divider | | | | | | |
| 2 | FlexRow | span=5 | 바코드상품 재고관리 사용여부 (Required) + InfoTooltip | Radio.Group `['filteredStorePolicyMap', 'BV']` (특수: Form.Item은 hidden, Radio.Group은 별도 value/onChange), span=7 | offset=1, span=4 | (빈칸) | (빈칸) span=7 |
| - | Divider | | | | | | |
| 3 | FlexRow | span=5 | 일일 판매 제한 설정 (Required) + InfoTooltip | Radio.Group `['filteredStorePolicyMap', 'DS']` options=yesNo, span=7 | offset=1, span=4 | 레시피 출력 여부 (Required) + InfoTooltip | Radio.Group `['filteredStorePolicyMap', 'PR']` options=yesNo, span=7 |
| - | Divider | | | | | | |
| 4 | FlexRow | span=5 | 원산지 표기 | Input.TextArea `['data', 'orgnIndiData']` span=19 | - | - | - |

### 패널 2: 모바일상품권 설정 (라인 912~1050)

```
<Collapse defaultActiveKey={['1']} ...>
  <Collapse.Panel key={'1'} header={`모바일상품권 설정`} className={storeSettingStyles.collapsePanel}>
```

**내부 항목:**
- Row: 상품교환권을 금액권으로 사용 (Col span=5 + Col (span없음)) → Radio.Group (사용/미사용)
- 조건부 (storePolicyVal === 'Y'): LinedFlexRow → 금액권 처리 정책 (전액사용/남은금액소멸)
- 기프티콘 Table (Form.List name="giftvchrSettList")
  - 업체명 Select + 상세설정 Button + 삭제 Button
  - 라인추가 Button (footer)

### 패널 3: 대기번호 채번 설정 (라인 1052~1329)

```
<Collapse defaultActiveKey={['1']} ...>
  <Collapse.Panel key={'1'} header={`대기번호 채번 설정`} className={storeSettingStyles.collapsePanel}>
```

**내부 항목:**
- Information 배너들 (조건부: waitNoModifyYn, waitNoIntgYn, waitNoAutoYn에 따라)
- CardBody 안 Space direction="vertical" size={20}:
  - FlexRow: 대기번호 채번 (통합/장비별/카테고리별) + 조건부 대기번호 범위
  - 조건부 LinedFlexRow: 번호 영역 부여방식 (자동부여/직접입력)
  - 조건부 FlexRow: 대기번호 시작번호 + 대기번호 단위선택
  - 조건부 Table: 장비별(waitNoIntgYn==='N') 또는 카테고리별(waitNoIntgYn==='C')
  - Divider
  - FlexRow: 주문상품별 대기번호 채번여부 (span=5+7) + 대기번호 대신 테이블명으로 고객 호출 (span=5+7)

### 패널 4: 매장 영업 및 운영시간 설정 (라인 1331~1637)

```
<Collapse defaultActiveKey={['1']} ...>
  <Collapse.Panel key={'1'} header={`매장 영업 및 운영시간 설정`} className={storeSettingStyles.collapsePanel}>
```

**내부 항목:**
- FlexRow: 자동마감여부 (자동마감/수동마감/자동마감개점)
- 조건부 LinedFlexRow: 자동마감 시간설정 (TimePicker)
- SetTimes 컴포넌트 (영업시간)
- Divider
- SetTimes 컴포넌트 (브레이크타임)
- Divider
- FlexRow: 휴무일 설정 (span=5+7) + 그 외 휴무일 설정 (span=5+7, Checkbox)
- 조건부: SetTimes 컴포넌트 (휴무일)
- Divider
- FlexRow: 휴무일 안내 채널 선택 (CommonCodeCheckbox)

### 외부 Collapse 컴포넌트 3개 (라인 1639~1641)

```tsx
<ParkingCollapse cntrExist={cntrExist} />
<RsvdCollapse cntrExist={cntrExist} />
<OtherOfferCollapse cntrExist={cntrExist} />
```

별도 파일에서 import된 독립 Collapse 컴포넌트.

### 패널 5: 포장비 부과 설정 (라인 1661~1782)

```
<Collapse expandIcon={...} style={{ backgroundColor: Colors.White }} expandIconPosition={'end'}>
  <Collapse.Panel key={'1'} header={<Space size={6}><Typography.Text>포장비 부과 설정</Typography.Text><Tooltip ...><ExclamationCircleFilled /></Tooltip></Space>} className={storeSettingStyles.collapsePanel}>
```

주의: `defaultActiveKey` 없음 (기본 닫힘)

**내부 항목:**
- FlexRow: 포장비 사용여부 (span=5+19, Radio)
- 조건부 (packamtYn==='Y'):
  - LinedFlexRow: 적용 금액 설정 (Col span=4+7) + 부과 대상 상품 선택 (Col offset=1, span=4+7)
  - LinedFlexRow: 추가 부과 설정 (Col span=4+20)

### 패널 6: 컵보증금 설정 (라인 1784~1877)

```
<Collapse ...>
  <Collapse.Panel key={'1'} header={<Space size={6}><Typography.Text>컵보증금 설정</Typography.Text><Tooltip ...>...</Tooltip></Space>} className={storeSettingStyles.collapsePanel}>
```

defaultActiveKey 없음 (기본 닫힘)

**내부 항목:**
- FlexRow: 컵보증금 사용여부 (span=5+19)
- 조건부 (cupDptUseYn==='Y'):
  - LinedFlexRow: 컵보증금 옵션상품선택 (span=5 + flex auto)
  - LinedFlexRow: 컵보증금 안내 팝업창 키오스크 설정 (span=5 + flex auto, Checkbox 3개)

### 패널 7: 키오스크 일회용품 제공 설정 (라인 1879~2055)

```
<Collapse ...>
  <Collapse.Panel key={'1'} header={<Space size={6}><Typography.Text>키오스크 일회용품 제공 설정</Typography.Text><Tooltip ...>...</Tooltip></Space>} className={storeSettingStyles.collapsePanel}>
```

defaultActiveKey 없음 (기본 닫힘)

**내부 항목:**
- Information 배너
- FlexRow: 포장주문시 일회용품 안내팝업 출력여부 (span=5+19, Radio)
- Divider
- FlexRow: span=24, 판매카테고리별 일회용품명 등록 Table (Form.List)

### ★ 패널 8: 기타 정책 설정 (라인 2057~2284) — 핵심 분석 대상

```
<Collapse
  expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 180 : 0} />}
  style={{ backgroundColor: Colors.White }}
  expandIconPosition={'end'}
  destroyInactivePanel={false}    ← 주의: 이 패널만 destroyInactivePanel={false}
>
  <Collapse.Panel key={'1'} header={`기타 정책 설정`} className={storeSettingStyles.collapsePanel}>
```

defaultActiveKey 없음 (기본 닫힘)

---

## 3. ★ "기타 정책 설정" 패널 내부 완전 분석

### 전체 구조

```
<CardBody>                    ← padding: 20px
  <FlexRow> ... </FlexRow>    ← Row 1
  <Divider />
  <FlexRow> ... </FlexRow>    ← Row 2
  <Divider />
  <FlexRow> ... </FlexRow>    ← Row 3 (주석처리 포함)
  <Divider />
  <FlexRow> ... </FlexRow>    ← Row 4
  <Divider />
  <FlexRow> ... </FlexRow>    ← Row 5
  {조건부 LinedFlexRow}        ← Row 5-1
  <Divider />
  <FlexRow> ... </FlexRow>    ← Row 6
  <Divider />
  <FlexRow> ... </FlexRow>    ← Row 7 (빈 행)
</CardBody>
```

### Row 1: 노출 다국어 선택 / 다국어 노출 여부 (라인 2065~2086)

```tsx
<FlexRow>
  <Col span={5}>
    <Typography.Text>노출 다국어 선택</Typography.Text>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={'indiLangList'}>
      <Checkbox.Group options={langOptions} onChange={handleLangChange} />
    </Form.Item>
  </Col>
  <Col span={5}>
    <Typography.Text>다국어 노출 여부</Typography.Text>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={['filteredStorePolicyMap', 'ML']}>
      <Radio.Group options={dynamicYesNoOptions} onChange={handleMultiLangChange} ... />
    </Form.Item>
  </Col>
</FlexRow>
```

| Col | span | 내용 |
|-----|------|------|
| 1 | 5 | 라벨: "노출 다국어 선택" |
| 2 | 7 | Checkbox.Group (동적 langOptions) |
| 3 | 5 | 라벨: "다국어 노출 여부" |
| 4 | 7 | Radio.Group (dynamicYesNoOptions - 2개 이상 선택 시 'N' disabled) |

### Divider

### Row 2: 진동벨 사용여부 / 인원수 체크 기능 (라인 2088~2105)

```tsx
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
```

| Col | span | 내용 |
|-----|------|------|
| 1 | 5 | 라벨: "진동벨 사용여부" |
| 2 | 7 | Radio.Group `VB` (사용/미사용) |
| 3 | 5 | 라벨: "인원수 체크 기능" |
| 4 | 7 | Radio.Group `CP` (사용/미사용) |

### Divider

### Row 3: 간편비밀번호 설정 / (주석처리: 포장비 부과 설정) (라인 2107~2150)

```tsx
<FlexRow>
  <Col span={5}>
    <Typography.Text>간편비밀번호 설정</Typography.Text>
  </Col>
  <Col span={7}>
    <Button onClick={setEasyPassword}>비밀번호 설정</Button>
  </Col>
  {/* 주석처리된 블록 (라인 2114~2149):
    <Col span={5}>
      <LabelFlex>
        <Typography.Text>포장주문시 포장비 부과 설정</Typography.Text>
        <InfoTooltip ... />
      </LabelFlex>
    </Col>
    <Col span={7}>
      <Space size={8}>
        {brandNo && brandNo > 0 && <Button>브랜드 정책 확인</Button>}
        <Button>매장 정책 설정</Button>
      </Space>
    </Col>
  */}
</FlexRow>
```

| Col | span | 내용 |
|-----|------|------|
| 1 | 5 | 라벨: "간편비밀번호 설정" |
| 2 | 7 | Button "비밀번호 설정" |
| (주석) | 5 | 포장주문시 포장비 부과 설정 + InfoTooltip |
| (주석) | 7 | Button "브랜드 정책 확인" + Button "매장 정책 설정" |

### Divider

### Row 4: 옵션상품 통합출력여부 / 주방프린터 출력 시점 (라인 2152~2190)

```tsx
<FlexRow>
  <Col span={5}>
    <Space style={{ paddingRight: 20 }}>
      옵션상품 통합출력여부
      <InfoTooltip tooltip={`상품별 매출 전표 출력 시 옵션상품은 매출이 함께 발생한 상품과 통합하여 출력`} ... />
    </Space>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={['filteredStorePolicyMap', 'OP']}>
      <Radio.Group options={yesNo} />
    </Form.Item>
  </Col>
  <Col span={5}>
    <Space style={{ paddingRight: 20 }}>
      주방프린터 출력 시점
      <InfoTooltip tooltip={`전달완료 시점으로 설정하면 KDS, POS에서 고객에 전달완료하는 시점에 주방프린터가 출력되요.`} ... />
    </Space>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={['data', 'kprntPrtTmCd']}>
      <Radio.Group options={kprntPrtTmCds?.list?.map(...)} />   ← 공통코드 동적 options
    </Form.Item>
  </Col>
</FlexRow>
```

| Col | span | 내용 |
|-----|------|------|
| 1 | 5 | "옵션상품 통합출력여부" + InfoTooltip (paddingRight:20) |
| 2 | 7 | Radio.Group `OP` (사용/미사용) |
| 3 | 5 | "주방프린터 출력 시점" + InfoTooltip (paddingRight:20) |
| 4 | 7 | Radio.Group `kprntPrtTmCd` (공통코드 기반 동적 options) |

### Divider

### Row 5: 직원호출 기능 / 전자영수증 사용여부 (라인 2192~2218)

```tsx
<FlexRow>
  <Col span={5}>
    <Space style={{ paddingRight: 20 }}>
      직원호출 기능
      <InfoCircleFilled className="icon" />
    </Space>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={['data', 'csCallFncYn']}>
      <Radio.Group options={yesNo} />
    </Form.Item>
  </Col>
  <Col span={5}>
    <Space style={{ paddingRight: 20 }}>
      전자영수증 사용여부
      <InfoTooltip tooltip={`전자영수증 설정을 사용하면...`} ... />
    </Space>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={['filteredStorePolicyMap', 'ER']}>
      <Radio.Group options={yesNo} />
    </Form.Item>
  </Col>
</FlexRow>
```

| Col | span | 내용 |
|-----|------|------|
| 1 | 5 | "직원호출 기능" + InfoCircleFilled (paddingRight:20) |
| 2 | 7 | Radio.Group `csCallFncYn` (사용/미사용) |
| 3 | 5 | "전자영수증 사용여부" + InfoTooltip (paddingRight:20) |
| 4 | 7 | Radio.Group `ER` (사용/미사용) |

### Row 5-1: 조건부 — 직원호출 안내설정 (csCallFncYn === 'Y') (라인 2220~2250)

```tsx
{csCallFncYn === 'Y' && (
  <LinedFlexRow style={{ padding: '22px 10px' }}>
    <Col span={5}>
      <Typography.Text>▶ 직원호출 안내설정</Typography.Text>
    </Col>
    <Col span={19}>
      <Space>
        <Form.Item noStyle name="ntcPopupUseYn" valuePropName="checked">
          <Checkbox><Space>알림팝업 <Tooltip ...><InfoCircleFilled /></Tooltip></Space></Checkbox>
        </Form.Item>
        <Form.Item noStyle name="paperPrtUseYn" valuePropName="checked">
          <Checkbox><Space>종이출력 <Tooltip ...><InfoCircleFilled /></Tooltip></Space></Checkbox>
        </Form.Item>
      </Space>
    </Col>
  </LinedFlexRow>
)}
```

### Divider

### Row 6: SNS 링크 설정 (라인 2252~2275)

```tsx
<FlexRow>
  <Col span={5}>
    <Space style={{ paddingRight: 20 }}>
      SNS 링크 설정
      <Tooltip ...><ExclamationCircleFilled className="icon" /></Tooltip>
    </Space>
  </Col>
  <Col span={4}>
    <Form.Item noStyle name={['data', 'snsLinkUseYn']}>
      <Radio.Group options={yesNo} />
    </Form.Item>
  </Col>
  <Col span={7}>
    <Button disabled={snsLinkUseYn === 'N'} onClick={...}>링크 설정</Button>
  </Col>
</FlexRow>
```

| Col | span | 내용 |
|-----|------|------|
| 1 | 5 | "SNS 링크 설정" + Tooltip/ExclamationCircleFilled |
| 2 | 4 | Radio.Group `snsLinkUseYn` (사용/미사용) — **주의: span=4 (다른 행과 다름)** |
| 3 | 7 | Button "링크 설정" (snsLinkUseYn==='N'이면 disabled) |

### Divider

### Row 7: 빈 행 (라인 2277~2281)

```tsx
<FlexRow>
  <Col span={5}></Col>
  <Col span={4}></Col>
  <Col span={7}></Col>
</FlexRow>
```

빈 FlexRow. UI상 하단 여백 역할로 보임.

---

## 4. 기타 정책 설정 이후 — 조건부 카드 2개

### 직원호출카드 설정 (라인 2286~2325)

```tsx
{csCallFncYn === 'Y' && (
  <Card title={<div className={styles.cardTitle}>직원호출카드 설정</div>} className="bordered-container">
```
- SortableTable로 호출카드 목록 관리
- 호출카드 등록/삭제 Button

### 직원호출 출력장비 설정 (라인 2327~2357)

```tsx
{paperPrtUseYn && (
  <Card title={<div className={styles.cardTitle}>직원호출 출력장비 설정 <Tooltip><InfoCircleFilled /></Tooltip></div>} ...>
```
- CallOutputEquipSetting 컴포넌트

---

## 5. 공통 컴포넌트/스타일 정의

### 5-1. FlexRow (StoreSetting.tsx 라인 1363~1374)

```typescript
export const FlexRow = styled(Row)`
  display: flex;
  align-items: center;
  padding-left: 10px;

  .ant-typography {
    font-style: normal;
    font-weight: 400;
    font-size: 14px;
    line-height: 150%;
  }
`
```

- Ant Design `Row` 기반 styled-component
- `display: flex; align-items: center;`
- `padding-left: 10px`
- 내부 Typography: 14px, weight 400, line-height 150%

### 5-2. LinedFlexRow (StoreSetting.tsx 라인 1376~1392)

```typescript
export const LinedFlexRow = styled(Row)`
  display: flex;
  align-items: center;
  padding: 12px 10px;
  margin: 20px 0px;
  background-color: #f9fafc;
  border-bottom: 1px solid var(--Color-Gray-Scale-Gray3, #e4e6ea);
  border-top: 1px solid var(--Color-Gray-Scale-Gray3, #e4e6ea);
  min-height: 68px;

  .ant-typography {
    font-style: normal;
    font-weight: 400;
    font-size: 14px;
    line-height: 150%;
  }
`
```

- FlexRow와 동일한 베이스 + 회색 배경(#f9fafc) + 상하 보더(#e4e6ea)
- padding: 12px 10px, margin: 20px 0
- min-height: 68px
- 하위 설정 블록(▶ 표시)에 사용

### 5-3. CardBody (StorePolicyCard.tsx 라인 2727~2729)

```typescript
const CardBody = styled.div`
  padding: 20px;
`
```

- 단순 div, padding 20px

### 5-4. StyledCol (StoreSetting.tsx 라인 1410~1412)

```typescript
export const StyledCol = styled(Col)`
  background-color: ${Colors.Gray1};
`
```

- 회색 배경 Col (품절상품의 배치 조건부 영역에 사용)

### 5-5. CardTitle (StoreSetting.tsx 라인 1394~1408)

```typescript
export const CardTitle = styled(Space)`
  .ant-typography { font-weight: 500; font-size: 16px; line-height: 150%; }
  span[role='img'] { color: ${Colors.Gray4}; }
  display: flex; align-items: center;
`
```

### 5-6. InfoTooltip (components/Tooltip/InfoTooltip/InfoTooltip.tsx)

- Props: tooltip, overlayStyle, overlayInnerStyle, type, iconType, iconSize
- 기본: InfoCircleFilled 아이콘, color=Colors.Gray4, size=12px
- Tooltip 내부 텍스트는 기본 text-align: center

### 5-7. storeSettingStyles.collapsePanel (StoreSetting.module.scss 라인 22~26)

```scss
.collapsePanel {
  :global(.ant-collapse-content-box) {
    padding: 0px !important;
  }
}
```

- Collapse.Panel의 content-box padding을 0으로 제거
- CardBody가 대신 padding: 20px를 부여

### 5-8. Collapse 공통 설정

모든 Collapse에 적용되는 공통 패턴:

```tsx
<Collapse
  expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 180 : 0} />}
  style={{ backgroundColor: Colors.White }}
  expandIconPosition={'end'}
>
```

- expandIcon: DownOutlined (활성 시 180도 회전)
- backgroundColor: Colors.White
- expandIconPosition: 'end' (우측)
- "기타 정책 설정"만 추가로 `destroyInactivePanel={false}` 설정

### 5-9. StyledSpan (라인 2715~2720)

```typescript
const StyledSpan = styled.span`
  color: #ff4d4f;
  font-weight: bold;
  margin-left: 5px;
`
```

- Required 마크 (*) 역할

---

## 6. "기타 정책 설정"에서 새 토글 항목 추가 시 패턴

표준적인 "라벨 + Radio.Group (사용/미사용)" 패턴:

```tsx
<FlexRow>
  <Col span={5}>
    <Space style={{ paddingRight: 20 }}>
      라벨 텍스트
      <InfoTooltip
        tooltip={`툴팁 내용`}
        overlayStyle={{ minWidth: 'max-content' }}
        overlayInnerStyle={{ whiteSpace: 'pre-wrap' }}
      />
    </Space>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={['filteredStorePolicyMap', 'XX']} 또는 name={['data', 'xxxYn']}>
      <Radio.Group options={yesNo} />
    </Form.Item>
  </Col>
  <Col span={5}>
    {/* 우측 라벨 또는 빈칸 */}
  </Col>
  <Col span={7}>
    {/* 우측 컴포넌트 또는 빈칸 */}
  </Col>
</FlexRow>
<Divider />
```

**Col span 배치 패턴:**
- 2열 배치: `5 + 7 + (offset=1) 4 + 7` = 24 또는 `5 + 7 + 5 + 7` = 24
- 1열 배치: `5 + 19` = 24 또는 `5 + 7` (나머지 빈칸)
- SNS 행 예외: `5 + 4 + 7` = 16 (합이 24 미만)

---

## 7. filteredStorePolicyMap 키 목록 (코드에서 확인)

| 키 | 항목명 | 위치 |
|----|--------|------|
| SD | 품절상품표시여부 | 상품 정책 설정 |
| TD | 상품상세보기표시여부 | 상품 정책 설정 |
| SL | 품절상품의 배치 | 상품 정책 설정 (조건부) |
| BV | 바코드상품 재고관리 | 상품 정책 설정 |
| DS | 일일 판매 제한 설정 | 상품 정책 설정 |
| PR | 레시피 출력 여부 | 상품 정책 설정 |
| ML | 다국어 노출 여부 | 기타 정책 설정 |
| VB | 진동벨 사용여부 | 기타 정책 설정 |
| CP | 인원수 체크 기능 | 기타 정책 설정 |
| OP | 옵션상품 통합출력여부 | 기타 정책 설정 |
| ER | 전자영수증 사용여부 | 기타 정책 설정 |

`['data', ...]` 경로로 저장되는 필드 (filteredStorePolicyMap 아님):
- `csCallFncYn`: 직원호출 기능
- `kprntPrtTmCd`: 주방프린터 출력 시점
- `snsLinkUseYn`: SNS 링크 설정

---

## 8. spec_회원유형_개선_v2.html 전체 구조 분석

### 8-1. 전체 HTML 구조

```
<!DOCTYPE html>
<html lang="ko">
<head>
  <style> (인라인 CSS 전체) </style>
</head>
<body>
  <div class="spec-board">        ← 최대 너비 1400px, 가운데 정렬
    타이틀 (.spec-title)
    부제 (.spec-subtitle)

    Section 1: 배경 및 문제점 (.section-title)
      - .frame (이슈 발단 경위 테이블)
      - .annotation-row (현재 문제 + 개선 방향)
      - .annotation-row (대기회원 운영 원칙 + 법적 근거)
      - .frame (회원유형 정의 테이블)
      - .problem-card.problem (As-Is)
      - .problem-card.solution (To-Be)

    <hr class="spec-divider">

    Section 2: 화면별 개선 사항 (.section-title)
      - .problem-card.solution (공통 안내)
      - h3 + .callout A: 회원 현황 탭
        - .annotation-row x2 (설명 카드)
        - .proto-embed (전체 레이아웃 프로토타입 — 순수 HTML/CSS)
      - <hr>
      - h3 + .callout C: 회원 정보 상세
        - .annotation-row (설명 카드)
        - .proto-embed (프로토타입)
      - <hr>
      - 스탬프 회원관리 프로토타입 (aside + 테이블)
      - <hr>
      - h3 + .callout E: 스탬프 내역 조회 → .proto-placeholder
      - h3 + .callout F: 스탬프 회원 상세 → .proto-placeholder

    <hr class="spec-divider">

    Section 3: 변경 항목 상세 (.section-title)
      - .frame (회원 현황 탭 field-table)
      - .frame (내역 조회 탭 field-table)
      - .frame (회원 정보 상세 field-table)

    푸터 (작성 정보)
  </div>
</body>
</html>
```

### 8-2. CSS 변수 전체 목록 (:root)

**색상:**
| 변수 | 값 | 용도 |
|------|-----|------|
| --color-primary | #286ef0 | 주요 파란색 |
| --color-primary-100 | #eaf1fe | 파란색 배경 연한 |
| --color-primary-200 | #d4e2fc | 파란색 보더 |
| --color-primary-b800 | #132c58 | 네이비 (제목, 헤더) |
| --color-white | #ffffff | 흰색 |
| --color-gray-1 | #f9fafc | 배경 연회색 |
| --color-gray-2 | #eff1f4 | 배경 회색 |
| --color-gray-3 | #e4e6ea | 보더 |
| --color-gray-4 | #d7dde4 | 보더 진한 |
| --color-gray-5 | #bec1c7 | 비활성 아이콘 |
| --color-gray-6 | #9da0a8 | - |
| --color-gray-7 | #7f828c | 부제 텍스트 |
| --color-gray-8 | #5a5e6a | 본문 텍스트 |
| --color-gray-9 | #3b3f4a | 제목 텍스트 |
| --color-black | #000000 | 검정 |
| --color-typo-title | #3b3f4a | 제목 색 |
| --color-typo-subtitle | #5a5e6a | 부제 색 |
| --color-typo-body | #7f828c | 본문 색 |
| --color-typo-disabled | #9da0a8 | 비활성 |
| --color-red | #eb2341 | 오류/위험 |
| --color-red-dark | #992534 | - |
| --color-red-light | #ffebee | 오류 배경 |
| --color-red-mid | #fc98a7 | 오류 보더 |
| --color-green | #18a358 | 성공 |
| --color-green-dark | #1f7343 | - |
| --color-green-light | #e8f6ef | 성공 배경 |
| --color-green-mid | #8cd1ab | 성공 보더 |
| --color-warning | #faad14 | 경고 |

**폰트:**
| 변수 | 값 |
|------|-----|
| --font-family | 'Pretendard Variable', 'Pretendard', -apple-system, ... |
| --fs-xs | 12px |
| --fs-sm | 14px |
| --fs-md | 16px |
| --fs-lg | 18px |
| --fs-xl | 20px |
| --fs-2xl | 24px |
| --fs-3xl | 28px |
| --fw-regular | 400 |
| --fw-medium | 500 |
| --fw-semibold | 600 |
| --fw-bold | 700 |

**레이아웃:**
| 변수 | 값 |
|------|-----|
| --radius-sm | 4px |
| --radius-md | 6px |
| --radius-lg | 8px |
| --radius-xl | 12px |
| --space-1 | 4px |
| --space-2 | 8px |
| --space-3 | 12px |
| --space-4 | 16px |
| --space-5 | 20px |
| --space-6 | 24px |
| --space-8 | 32px |
| --space-10 | 40px |

### 8-3. CSS 클래스와 역할

| 클래스 | 역할 | 주요 스타일 |
|--------|------|------------|
| `.spec-board` | 최외곽 컨테이너 | max-width:1400px, margin:0 auto |
| `.spec-title` | 페이지 제목 | 36px, bold, color: navy |
| `.spec-subtitle` | 부제 (티켓, 대상 화면 등) | 16px, subtitle색, 하단 40px 마진 |
| `.spec-subtitle .tag` | 티켓 번호 태그 | inline-block, 파란배경, 흰글씨, 14px semibold |
| `.section-title` | 섹션 제목 (1, 2, 3) | 24px bold navy, 하단 보더 2px navy |
| `.section-title .num` | 원형 번호 | 32x32 원형, navy 배경, 흰 숫자 |
| `.annotation-row` | 설명 카드 행 | display:flex, gap:24px |
| `.annotation-card` | 설명 카드 | flex:1, 흰배경, radius:10px, padding:24px, 보더+그림자 |
| `.annotation-card h4` | 카드 제목 | 16px bold navy, gap:8px |
| `.annotation-card .highlight` | 강조 텍스트 | 파란색 bold |
| `.callout` | 번호 원형 (기본: 파란) | 24x24 원형, 12px bold 흰글씨 |
| `.callout.green` | 녹색 원형 | |
| `.callout.red` | 빨간 원형 | |
| `.callout.orange` | 주황 원형 | |
| `.problem-card` | 문제/해결 카드 | padding:20px 24px, radius:8px |
| `.problem-card.problem` | As-Is (빨간) | 빨간 배경+보더 |
| `.problem-card.solution` | To-Be (녹색) | 녹색 배경+보더 |
| `.frame` | 테이블 프레임 | 흰배경, radius:12px, 보더+그림자 |
| `.frame-label` | 프레임 제목 바 | #f5f6f8 배경, 하단보더, 16px bold |
| `.field-table` | 데이터 테이블 | 100% width, collapse |
| `.field-table th` | 테이블 헤더 | #f5f6f8 배경, 16px semibold |
| `.field-table .fn` | 필드명 | bold, title색 |
| `.field-table .ft` | 필드 타입/설명 | body색 |
| `.field-table .tag` | 인라인 태그 | inline-flex, 12px |
| `.tag--primary` | 파란 태그 | 파란 계열 배경/보더/글씨 |
| `.tag--green` | 녹색 태그 | |
| `.tag--gray` | 회색 태그 | |
| `.spec-divider` | 섹션 구분선 | dashed, 상하 40px |
| `.proto-placeholder` | UI 시안 플레이스홀더 | dashed 보더, 회색배경, 가운데정렬 |
| `.proto-embed` | 실제 UI 시안 (인라인) | 보더+radius+그림자 |
| `.screen-tab` | 탭 컨테이너 | display:flex |
| `.screen-tab-item` | 탭 항목 | 보더, 배경 |
| `.screen-tab-item.active` | 활성 탭 | 흰배경, 파란글씨 |
| `.screen-panel` | 탭 콘텐츠 영역 | 보더, radius |

### 8-4. 섹션 구성 패턴

1. **배경/문제점 섹션** (Section 1)
   - `.frame` + `.field-table`: 이슈 경위 테이블
   - `.annotation-row` x2: 현재 문제 / 개선 방향 + 운영 원칙 / 법적 근거
   - `.frame` + `.field-table`: 정의 테이블
   - `.problem-card.problem`: As-Is
   - `.problem-card.solution`: To-Be

2. **화면별 개선 사항 섹션** (Section 2)
   - 화면 단위별 h3 + `.callout` 레터
   - `.annotation-row`: 변경 포인트 설명 카드
   - `.proto-embed`: **순수 HTML/CSS**로 구현된 실제 UI 시안
     - header (글로벌 헤더 - 네이비)
     - aside (사이드바 - 메뉴 트리)
     - main (탭 + 필터 + 테이블)
     - Ant Design 미사용, React 미사용, 순수 인라인 CSS
   - `.proto-placeholder`: 별도 구현하지 않은 화면 표시

3. **변경 항목 상세 섹션** (Section 3)
   - `.frame` + `.field-table`: 항목명 / 변경유형 / 설명 3열 테이블

### 8-5. annotation 카드 패턴

```html
<div class="annotation-row">
  <div class="annotation-card" style="border-color: var(--color-red-mid);">
    <h4><span class="callout red">!</span> 제목</h4>
    <p>설명... <span class="highlight">강조 텍스트</span> ...</p>
  </div>
  <div class="annotation-card" style="border-color: var(--color-green-mid);">
    <h4><span class="callout green">&#10003;</span> 제목</h4>
    <p>설명...</p>
  </div>
</div>
```

- callout 색상으로 성격 구분 (red=문제, green=해결, orange=주의, blue=정보)
- annotation-card의 border-color를 인라인으로 오버라이드하여 강조 정도 조절
- 기본 border는 --color-gray-3

### 8-6. UI 시안 구현 방식

- **React/Ant Design 미사용**
- 순수 HTML + 인라인 CSS로 모든 UI 요소 재현
- 글로벌 헤더: `<header>` (background:#132c58, height:64px)
- 사이드바: `<aside>` (width:200px, 메뉴 트리 직접 구현)
- 메인 콘텐츠: `<div>` (flex:1)
- 테이블 헤더: `background:#132c58; color:white;`
- 체크박스: `div`로 직접 그림 (width:16px, height:16px, border-radius:2px)
- 라디오: `div`로 직접 그림 (border-radius:50%)
- [To-be] 표시: HTML 주석으로 `<!-- [To-be] ... -->` 위치 마킹
- disabled 상태: `opacity:0.5; cursor:not-allowed;`
- 안내 라벨: `<span>` (font-size:12px, color:primary)

---

## 9. 디자인 시스템 변수/스타일 비교

### 9-1. 색상 매핑

| spec HTML 변수 | 실제 코드 (Colors 객체/CSS 변수) | 비고 |
|---------------|-------------------------------|------|
| --color-primary (#286ef0) | Colors.Primary.Main | 동일 |
| --color-primary-100 (#eaf1fe) | Colors.Primary.P100 | 동일 |
| --color-primary-b800 (#132c58) | 글로벌 헤더 배경 | 동일 |
| --color-white (#ffffff) | Colors.White | 동일 |
| --color-gray-1 (#f9fafc) | Colors.Gray1, LinedFlexRow 배경 | 동일 |
| --color-gray-3 (#e4e6ea) | var(--Color-Gray-Scale-Gray3, #e4e6ea) | 동일 |
| --color-gray-4 (#d7dde4) | Colors.Gray4, InfoTooltip 기본색 | 동일 |
| --color-gray-8 (#5a5e6a) | Colors.Gray8 | 동일 |

### 9-2. 폰트 매핑

| spec HTML | 실제 코드 | 비고 |
|-----------|----------|------|
| Pretendard Variable | 프로젝트 전역 폰트 | 동일 |
| 14px (--fs-sm) | FlexRow/LinedFlexRow 내부 Typography | 동일 |
| 16px (--fs-md) | CardTitle Typography | 동일 |
| fw:400 | FlexRow 내부 기본 weight | 동일 |
| fw:500 | CardTitle weight | 동일 |
| fw:700 | .spec-title, 강조 | 동일 |

### 9-3. 레이아웃 매핑

| spec HTML 패턴 | 실제 코드 패턴 | 비고 |
|---------------|---------------|------|
| 프레임 border 1px solid gray-4 | Collapse border | 유사 |
| 프레임 radius 12px | Collapse Panel radius 8px | 약간 다름 |
| 프레임-label 배경 #f5f6f8 | Collapse.Panel header | Ant Design 기본 스타일 |
| field-table th 배경 #f5f6f8 | LinedFlexRow 배경 #f9fafc | 유사 (gray-1) |
| proto-embed 헤더 높이 64px | 실제 백오피스 헤더 | 동일 |
| aside 너비 200px | 실제 사이드바 | 동일 |

### 9-4. 컴포넌트 패턴 매핑 (spec 재현 시 참고)

| 실제 코드 컴포넌트 | spec HTML 재현 방식 |
|-------------------|-------------------|
| Collapse + Collapse.Panel | `<div class="frame">` + `<div class="frame-label">` |
| FlexRow (Row) | `<div style="display:flex; align-items:center;">` |
| Col span=5 | `<span style="width:120px;">` 또는 `flex:0 0 20.83%` |
| Radio.Group | `<div>` + `<label>` + 원형 div |
| Checkbox | `<label>` + 사각형 div |
| InfoTooltip | 아이콘만 (i) 표시, 또는 생략 |
| Divider | `<div style="height:1px; background:gray-3;">` |
| Typography.Text | `<span>` |
| Button | `<button style="...">` |

---

## 10. spec HTML 작성 시 체크리스트

새 spec을 만들 때 spec_회원유형_개선_v2.html의 구조를 따르려면:

1. **`<head>` 섹션**: 동일한 CSS 변수(:root)와 클래스 정의를 그대로 복사
2. **`<body>`**: `<div class="spec-board">` 감싸기
3. **타이틀**: `.spec-title` + `.spec-subtitle` (태그 포함)
4. **Section 1 (배경)**: `.section-title` + `.num` → `.annotation-row` (문제/해결) → `.problem-card`
5. **Section 2 (화면별 개선)**: h3 + `.callout` → `.annotation-row` → `.proto-embed` (순수 HTML/CSS UI 시안)
6. **Section 3 (변경 항목)**: `.frame` + `.field-table` (항목/변경유형/설명)
7. **UI 시안**: 인라인 CSS로 실제 백오피스 화면 재현 (글로벌 헤더 + 사이드바 + 메인)
8. **[To-be] 마킹**: HTML 주석 `<!-- [To-be] ... -->`과 시각적 강조 (border-color primary 등)
9. **푸터**: 작성/수정일

---

## 11. 기타 정책 설정에 새 토글 추가 시 정확한 위치

기타 정책 설정의 마지막 활성 항목은 Row 6 (SNS 링크 설정) + Divider + Row 7 (빈 행).

**새 토글을 추가할 위치**: Row 6 (SNS 링크 설정) 다음 Divider 이후, 빈 Row 7 자리에 삽입하거나, Row 7 직전에 새 FlexRow + Divider를 추가.

**가장 자연스러운 추가 패턴:**

```tsx
// Row 6 (SNS 링크 설정) 다음 Divider 이후에:
<FlexRow>
  <Col span={5}>
    <Space style={{ paddingRight: 20 }}>
      POS 매출전표 당일 취소결제 반영여부
      <InfoTooltip
        tooltip={`관련 설명 텍스트`}
        overlayStyle={{ minWidth: 'max-content' }}
        overlayInnerStyle={{ whiteSpace: 'pre-wrap' }}
      />
    </Space>
  </Col>
  <Col span={7}>
    <Form.Item noStyle name={['filteredStorePolicyMap', 'XX']} 또는 name={['data', 'xxxYn']}>
      <Radio.Group options={yesNo} />
    </Form.Item>
  </Col>
  <Col span={5}>
    {/* 필요 시 다른 항목 */}
  </Col>
  <Col span={7}>
    {/* 필요 시 다른 항목 */}
  </Col>
</FlexRow>
<Divider />
```
