# git-jandi — technical.md (draft)

> repo 루트에 배치할 기술 설계 문서. 프로젝트 생성 시 이 내용을 `~/dev/git-jandi/technical.md`로 복사.

---

# Technical Design

## 데이터 흐름

```
CLI (index.ts)
  │  username, options 파싱
  ▼
Fetch (fetch.ts)
  │  GET https://github.com/users/{username}/contributions
  │  HTML → 파싱 → ContributionData
  ▼
Streak (streak.ts)
  │  ContributionData → StreakInfo
  ▼
Render (render.ts)
  │  ContributionData + StreakInfo + Theme → ANSI 문자열 → stdout
  ▼
터미널 출력
```

## 타입 정의

```typescript
/** 하루치 contribution */
interface DayData {
  date: string;    // "2025-03-02"
  level: number;   // 0-4
}

/** 주 단위 (일~토, 최대 7일) */
type WeekData = DayData[];

/** fetch 결과 전체 */
interface ContributionData {
  total: number;        // 총 contribution 수
  weeks: WeekData[];    // 53주 분량 (첫 주/마지막 주는 7일 미만 가능)
}

/** streak 계산 결과 */
interface StreakInfo {
  current: number;  // 현재 연속 일수
  max: number;      // 최대 연속 일수
}

/** 색상 테마 */
interface Theme {
  colors: [string, string, string, string, string];  // level 0~4 hex 색상
}
```

## 모듈 상세

### fetch.ts

```typescript
export async function fetchContributions(username: string): Promise<ContributionData>
```

**역할:** GitHub contributions 페이지를 가져와 파싱

**구현 상세:**
- `fetch()` (Node 18+ 내장) 사용 — 외부 HTTP 라이브러리 불필요
- HTML 파싱: 정규식 기반 경량 파싱 (DOM 파서 의존성 제거)
  - `<td ... data-date="YYYY-MM-DD" ... data-level="N" ...>` 패턴 매칭
  - `<h2>` 태그에서 총 contribution 수 추출
- 주(week) 그룹핑: `<tr>` 기준이 아닌 날짜 기반으로 재구성
  - GitHub HTML은 요일별 `<tr>` (가로=주) 구조이므로, 날짜순 정렬 후 7일 단위로 week 재구성

**파싱 전략:**
```
HTML 원본 구조:        우리가 원하는 구조:
tr[0]: 일요일들         week[0]: 3/2(일)~3/8(토)
tr[1]: 월요일들         week[1]: 3/9(일)~3/15(토)
tr[2]: 화요일들         ...
...
tr[6]: 토요일들
```
- 모든 `<td>` 에서 `data-date`, `data-level` 추출
- 날짜순 정렬 → ISO week 기준 그룹핑

**에러 처리:**
- HTTP 404 → `Error: User "${username}" not found`
- 네트워크 오류 → `Error: Failed to fetch contributions. Check your network connection.`
- 파싱 실패 (data-date 0건) → `Error: Failed to parse contribution data. GitHub page format may have changed.`

### streak.ts

```typescript
export function calculateStreak(weeks: WeekData[]): StreakInfo
```

**역할:** contribution 데이터에서 current/max streak 계산

**알고리즘:**
1. 전체 날짜를 최신일부터 역순 순회
2. `current streak`: 오늘(또는 가장 최근 날짜)부터 연속 contribution > 0인 일수
   - 오늘이 아직 level 0이어도, 어제까지 연속이면 어제 기준으로 계산 (하루 유예)
3. `max streak`: 전체 기간 중 최장 연속 일수
4. 단일 패스로 양쪽 모두 계산 (O(n), n ≈ 370)

**하루 유예 로직:**
```
오늘 = 0, 어제 = 1, 그제 = 1, ... → current = 어제부터 카운트
오늘 = 1, 어제 = 1, 그제 = 0, ... → current = 오늘부터 카운트
오늘 = 0, 어제 = 0, ...           → current = 0
```

### colors.ts

```typescript
export const THEMES: Record<string, Theme> = { dark: ..., light: ... }
export function getDefaultTheme(): Theme
```

**역할:** contribution level → 터미널 색상 매핑

**테마:**
```typescript
const dark: Theme = {
  colors: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
};

const light: Theme = {
  colors: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
};
```

**기본 테마 선택:** `dark` 고정 (대부분의 터미널이 다크 배경)
- `--light` 옵션으로 전환

### render.ts

```typescript
export function renderGraph(data: ContributionData, streak: StreakInfo, theme: Theme, hideStreak: boolean): string
```

**역할:** 최종 터미널 출력 문자열 생성

**출력 레이아웃:**
```
507 contributions in the last year   Current streak: 14   Max streak: 14
Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec  Jan  Feb  Mar
■ ■ ■ ■ ■ ■ ...  (일요일 행)
■ ■ ■ ■ ■ ■ ...  (월요일 행)
...
■ ■ ■ ■ ■ ■ ...  (토요일 행)
                                                Less ■ ■ ■ ■ ■ More
```

**렌더링 상세:**
1. **헤더:** total + streak (bold)
2. **월 레이블:** 각 월의 첫 주 위치에 약어 배치 (Jan, Feb, ...)
3. **잔디 본체:** `■` 문자 + ANSI 256색/트루컬러
   - 주 단위 열, 요일 단위 행 (전치 행렬)
   - `\x1b[38;2;R;G;Bm■\x1b[0m` 형식
4. **범례:** 우하단 Less/More + 5단계 색상 블록

**ANSI 색상:**
```typescript
function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}
```

### index.ts (CLI 진입점)

```typescript
#!/usr/bin/env node
```

**인자 파싱:** 직접 구현 (외부 라이브러리 없음) — 인자가 단순하므로
- `argv[2]` → username (필수)
- `--no-streak` / `-s` → streak 숨기기
- `--light` → 라이트 테마
- `--help` / `-h` → 도움말
- `--version` / `-v` → 버전

**종료 코드:**
- `0` — 성공
- `1` — 에러 (사용자 없음, 네트워크 오류 등)

## 외부 의존성

| 패키지 | 용도 | 선택 근거 |
|--------|------|-----------|
| (없음) | — | **zero dependency** 목표 |

- HTTP: Node.js 내장 `fetch` (18+)
- HTML 파싱: 정규식 (cheerio 등 불필요 — 추출 대상이 `data-*` 속성 2개뿐)
- CLI 파싱: 직접 구현 (옵션 3개뿐)
- 색상 출력: ANSI escape 직접 생성 (chalk 불필요)

**Node.js 최소 버전:** 18 (내장 fetch 필요)

## 성능 고려사항

- HTTP 요청 1회, HTML ~30KB, 파싱 대상 ~370개 `<td>` → 수십ms 이내
- 전체 실행 시간의 대부분은 네트워크 latency (파싱/렌더링은 무시 가능)
- 캐싱 불필요 (일회성 CLI 실행)
