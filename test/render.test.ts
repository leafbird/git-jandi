import { describe, it, expect } from "vitest";
import { renderGraph } from "../src/render.js";
import { THEME } from "../src/colors.js";
import type { ContributionData, StreakInfo } from "../src/types.js";

function makeTestData(): ContributionData {
  // 4주짜리 간단한 데이터
  const weeks = [];
  const start = new Date("2025-01-05T00:00:00"); // 일요일
  for (let w = 0; w < 4; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(date.getDate() + w * 7 + d);
      week.push({
        date: date.toISOString().slice(0, 10),
        level: (w + d) % 5,
      });
    }
    weeks.push(week);
  }
  return { total: 42, weeks, source: "html" };
}

const streak: StreakInfo = { current: 5, max: 10 };

describe("renderGraph", () => {
  it("총 contribution 수가 출력에 포함된다", () => {
    const output = renderGraph(makeTestData(), streak, THEME, false);
    expect(output).toContain("42");
    expect(output).toContain("contributions in the last year");
  });

  it("streak 정보가 포함된다", () => {
    const output = renderGraph(makeTestData(), streak, THEME, false);
    expect(output).toContain("Current streak: 5");
    expect(output).toContain("Max streak: 10");
  });

  it("hideStreak=true이면 streak이 출력되지 않는다", () => {
    const output = renderGraph(makeTestData(), streak, THEME, true);
    expect(output).not.toContain("Current streak");
    expect(output).not.toContain("Max streak");
  });

  it("범례가 포함된다", () => {
    const output = renderGraph(makeTestData(), streak, THEME, false);
    expect(output).toContain("Less");
    expect(output).toContain("More");
  });

  it("■ 블록 문자가 포함된다", () => {
    const output = renderGraph(makeTestData(), streak, THEME, false);
    expect(output).toContain("■");
  });

  it("월 레이블이 포함된다", () => {
    const output = renderGraph(makeTestData(), streak, THEME, false);
    expect(output).toContain("Jan");
  });

  it("ANSI 색상 코드가 포함된다", () => {
    const output = renderGraph(makeTestData(), streak, THEME, false);
    // truecolor escape: \x1b[38;2;R;G;Bm
    expect(output).toMatch(/\x1b\[38;2;\d+;\d+;\d+m/);
  });

  it("단일 테마로 정상 렌더링된다", () => {
    const output = renderGraph(makeTestData(), streak, THEME, false);
    expect(output).toContain("■");
    expect(output).toContain("42");
  });
});
