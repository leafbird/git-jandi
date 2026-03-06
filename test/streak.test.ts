import { describe, it, expect, vi, afterEach } from "vitest";
import { calculateStreak } from "../src/streak.js";
import type { WeekData } from "../src/types.js";

/** UTC 기준 오늘 문자열 (streak 로직과 동일 기준) */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 기준일로부터 n일 전 날짜 문자열 */
function daysAgo(base: string, n: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function makeDays(
  levels: number[],
  startDate: string = "2025-01-05"
): WeekData[] {
  const start = new Date(startDate + "T00:00:00Z");
  const days = levels.map((level, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), level };
  });

  const weeks: WeekData[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

describe("calculateStreak", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("빈 데이터는 0/0", () => {
    expect(calculateStreak([])).toEqual({ current: 0, max: 0 });
  });

  it("전부 0이면 0/0", () => {
    const weeks = makeDays([0, 0, 0, 0, 0, 0, 0]);
    expect(calculateStreak(weeks)).toEqual({ current: 0, max: 0 });
  });

  it("연속 contribution의 max streak 계산", () => {
    // 3일 연속, 1일 빔, 5일 연속
    const weeks = makeDays([1, 1, 1, 0, 1, 1, 1, 1, 1, 0]);
    const result = calculateStreak(weeks);
    expect(result.max).toBe(5);
  });

  it("마지막 날이 오늘이고 level > 0이면 current streak에 포함", () => {
    const today = todayStr();
    const weeks = makeDays([1, 1, 1], daysAgo(today, 2));
    const result = calculateStreak(weeks);
    expect(result.current).toBe(3);
  });

  it("하루 유예: 오늘이 0이고 어제가 1이면 어제부터 카운트", () => {
    const today = todayStr();
    // 오늘 포함 4일: 3일 연속 + 오늘 0
    const weeks = makeDays([1, 1, 1, 0], daysAgo(today, 3));
    // 마지막 날이 오늘인지 확인
    const lastDay = weeks.flat().at(-1)!;
    expect(lastDay.date).toBe(today);
    const result = calculateStreak(weeks);
    expect(result.current).toBe(3);
  });

  it("오늘도 0, 어제도 0이면 current = 0", () => {
    const today = todayStr();
    const weeks = makeDays([1, 0, 0], daysAgo(today, 2));
    const result = calculateStreak(weeks);
    expect(result.current).toBe(0);
  });

  it("전체가 연속이면 max = current = 전체 길이", () => {
    const today = todayStr();
    const weeks = makeDays([1, 1, 1, 1, 1, 1, 1], daysAgo(today, 6));
    const result = calculateStreak(weeks);
    expect(result.current).toBe(7);
    expect(result.max).toBe(7);
  });
});
