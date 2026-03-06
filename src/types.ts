/** 하루치 contribution */
export interface DayData {
  date: string;   // "2025-03-02"
  level: number;  // 0-4
}

/** 주 단위 (일~토, 최대 7일) */
export type WeekData = DayData[];

/** fetch 결과 전체 */
export interface ContributionData {
  total: number;       // 총 contribution 수
  weeks: WeekData[];   // 53주 분량
}

/** streak 계산 결과 */
export interface StreakInfo {
  current: number;  // 현재 연속 일수
  max: number;      // 최대 연속 일수
}

/** 색상 테마 */
export interface Theme {
  colors: [string, string, string, string, string];  // level 0~4 hex
}
