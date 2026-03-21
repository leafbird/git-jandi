import type { ContributionData, StreakInfo, Theme } from "./types.js";
import { hexToAnsi, RESET, BOLD } from "./colors.js";

const BLOCK = "■";
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * contribution 그래프를 터미널 ANSI 문자열로 렌더링한다.
 *
 * 출력 레이아웃:
 *   507 contributions in the last year   Current streak: 14   Max streak: 14
 *   Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec  Jan  Feb  Mar
 *   ■ ■ ■ ■ ...  (일요일 행)
 *   ■ ■ ■ ■ ...  (월요일 행)
 *   ...
 *   ■ ■ ■ ■ ...  (토요일 행)
 *                                                    Less ■ ■ ■ ■ ■ More
 */
export function renderGraph(
  data: ContributionData,
  streak: StreakInfo,
  theme: Theme,
  hideStreak: boolean
): string {
  const lines: string[] = [];

  // 헤더: total + streak
  let header = `${BOLD}${data.total}${RESET} contributions in the last year`;
  if (!hideStreak) {
    header += `   Current streak: ${streak.current}   Max streak: ${streak.max}`;
  }
  lines.push(header);

  // weeks → 전치 행렬 (7행 × N열)
  // 각 행 = 한 요일의 모든 주
  const rows = transpose(data.weeks);
  const colCount = data.weeks.length;

  // 월 레이블
  lines.push(buildMonthLine(data.weeks, colCount));

  // 잔디 본체
  for (const row of rows) {
    let line = "";
    for (const day of row) {
      line += `${hexToAnsi(theme.colors[day.level])}${BLOCK} ${RESET}`;
    }
    lines.push(line);
  }

  // 범례 + 데이터 소스
  const legendWidth = colCount * 2;
  const sourceLabel = data.source === "graphql" ? "via GitHub API" : "via HTML scraping";
  const legendContent = buildLegend(theme);
  const bottomRight = legendContent + "  " + sourceLabel;
  const padding = Math.max(0, legendWidth - stripAnsi(bottomRight).length);
  lines.push(" ".repeat(padding) + bottomRight);

  return lines.join("\n");
}

/** weeks (주 단위 열) → 요일 단위 행으로 전치 */
function transpose(
  weeks: ContributionData["weeks"]
): ContributionData["weeks"] {
  const rows: ContributionData["weeks"] = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const row: ContributionData["weeks"][0] = [];
    for (const week of weeks) {
      if (week[dayIndex]) {
        row.push(week[dayIndex]);
      }
    }
    if (row.length > 0) rows.push(row);
  }
  return rows;
}

/** 월 레이블 라인 생성 */
function buildMonthLine(
  weeks: ContributionData["weeks"],
  colCount: number
): string {
  // 각 주의 첫 번째 날짜에서 월 추출
  let line = "";
  let lastMonth = -1;

  for (let i = 0; i < colCount; i++) {
    const firstDay = weeks[i]?.[0];
    if (!firstDay) {
      line += "  ";
      continue;
    }

    const month = parseInt(firstDay.date.slice(5, 7), 10) - 1;

    if (month !== lastMonth) {
      const label = MONTHS[month];
      // 현재 line의 실제 문자 위치가 col 위치(i*2)에 맞는지 확인
      const targetPos = i * 2;
      const currentLen = line.length;

      if (targetPos > currentLen) {
        line += " ".repeat(targetPos - currentLen);
      }
      line += label;
      lastMonth = month;
    }
  }

  return line;
}

/** 범례 생성: Less ■ ■ ■ ■ ■ More */
function buildLegend(theme: Theme): string {
  let legend = "Less ";
  for (const color of theme.colors) {
    legend += `${hexToAnsi(color)}${BLOCK} ${RESET}`;
  }
  legend += "More";
  return legend;
}

/** ANSI escape 코드를 제거한 순수 문자열 길이 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}
