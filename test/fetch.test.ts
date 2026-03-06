import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseHTML } from "../src/fetch.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureHTML = readFileSync(
  join(__dirname, "fixtures/contributions.html"),
  "utf-8"
);

describe("parseHTML", () => {
  it("총 contribution 수를 파싱한다", () => {
    const data = parseHTML(fixtureHTML);
    expect(data.total).toBeGreaterThan(0);
    expect(data.total).toBe(542); // fixture 기준 값
  });

  it("주(week) 데이터를 올바르게 그룹핑한다", () => {
    const data = parseHTML(fixtureHTML);
    // 약 53주
    expect(data.weeks.length).toBeGreaterThanOrEqual(52);
    expect(data.weeks.length).toBeLessThanOrEqual(54);
  });

  it("각 주는 최대 7일이다", () => {
    const data = parseHTML(fixtureHTML);
    for (const week of data.weeks) {
      expect(week.length).toBeGreaterThanOrEqual(1);
      expect(week.length).toBeLessThanOrEqual(7);
    }
  });

  it("각 날짜의 level은 0~4이다", () => {
    const data = parseHTML(fixtureHTML);
    for (const week of data.weeks) {
      for (const day of week) {
        expect(day.level).toBeGreaterThanOrEqual(0);
        expect(day.level).toBeLessThanOrEqual(4);
      }
    }
  });

  it("날짜 형식은 YYYY-MM-DD이다", () => {
    const data = parseHTML(fixtureHTML);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const week of data.weeks) {
      for (const day of week) {
        expect(day.date).toMatch(dateRegex);
      }
    }
  });

  it("날짜가 시간순으로 정렬되어 있다", () => {
    const data = parseHTML(fixtureHTML);
    const allDates = data.weeks.flat().map((d) => d.date);
    const sorted = [...allDates].sort();
    expect(allDates).toEqual(sorted);
  });

  it("빈 HTML이면 에러를 던진다", () => {
    expect(() => parseHTML("<html></html>")).toThrow(
      "Failed to parse contribution data"
    );
  });
});
