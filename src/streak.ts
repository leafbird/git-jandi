import type { DayData, StreakInfo, WeekData } from "./types.js";

/**
 * contribution 데이터에서 current/max streak을 계산한다.
 *
 * - current streak: 가장 최근 날짜부터 연속 contribution 일수
 *   (마지막 날이 오늘이고 level=0이면 스킵하고 그 전날부터 카운트 — 하루 유예)
 * - max streak: 전체 기간 중 최장 연속 일수
 *
 * 단일 패스, O(n).
 */
export function calculateStreak(weeks: WeekData[]): StreakInfo {
  const allDays: DayData[] = weeks
    .flat()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (allDays.length === 0) {
    return { current: 0, max: 0 };
  }

  // max streak: 전체 순회
  let maxStreak = 0;
  let streak = 0;

  for (const day of allDays) {
    if (day.level > 0) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 0;
    }
  }

  // current streak: 뒤에서부터 역순 순회
  const today = new Date().toISOString().slice(0, 10);
  let currentStreak = 0;

  // 시작 인덱스 결정: 마지막 날이 오늘이고 0이면 하루 유예 (스킵)
  let startIdx = allDays.length - 1;
  if (allDays[startIdx].date === today && allDays[startIdx].level === 0) {
    startIdx--;
  }

  for (let i = startIdx; i >= 0; i--) {
    if (allDays[i].level > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  return { current: currentStreak, max: maxStreak };
}
