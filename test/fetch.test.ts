import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as child_process from "child_process";
import { fetchContributions, parseHTML, COLOR_TO_LEVEL } from "../src/fetch.js";

vi.mock("child_process", async () => {
  const actual = await vi.importActual<typeof child_process>("child_process");
  return { ...actual, execSync: vi.fn() };
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureHTML = readFileSync(
  join(__dirname, "fixtures/contributions.html"),
  "utf-8"
);
const fixtureGraphQL = JSON.parse(
  readFileSync(join(__dirname, "fixtures/graphql-response.json"), "utf-8")
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

describe("COLOR_TO_LEVEL", () => {
  it("GitHub 기본 5색을 level 0-4로 매핑한다", () => {
    expect(COLOR_TO_LEVEL["#ebedf0"]).toBe(0);
    expect(COLOR_TO_LEVEL["#9be9a8"]).toBe(1);
    expect(COLOR_TO_LEVEL["#40c463"]).toBe(2);
    expect(COLOR_TO_LEVEL["#30a14e"]).toBe(3);
    expect(COLOR_TO_LEVEL["#216e39"]).toBe(4);
  });
});

describe("fetchContributions (GraphQL)", () => {
  const originalToken = process.env.GITHUB_TOKEN;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalToken !== undefined) {
      process.env.GITHUB_TOKEN = originalToken;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
  });

  it("GITHUB_TOKEN이 있으면 GraphQL API를 호출한다", async () => {
    process.env.GITHUB_TOKEN = "test-token";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(fixtureGraphQL),
    });
    vi.stubGlobal("fetch", mockFetch);

    const data = await fetchContributions("leafbird");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/graphql");
    expect((options.headers as Record<string, string>).Authorization).toBe(
      "bearer test-token"
    );
  });

  it("GITHUB_TOKEN이 없고 gh CLI도 없으면 HTML 스크래핑을 사용한다", async () => {
    delete process.env.GITHUB_TOKEN;
    vi.mocked(child_process.execSync).mockImplementation(() => {
      throw new Error("command not found: gh");
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(fixtureHTML),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchContributions("leafbird");

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("github.com/users/leafbird/contributions");
  });

  it("GraphQL 응답을 ContributionData로 올바르게 변환한다", async () => {
    process.env.GITHUB_TOKEN = "test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(fixtureGraphQL),
      })
    );

    const data = await fetchContributions("leafbird");

    expect(data.total).toBe(542);
    expect(data.weeks).toHaveLength(3);
    expect(data.weeks[0]).toHaveLength(7);
    expect(data.weeks[2]).toHaveLength(3); // 불완전한 마지막 주

    // level 매핑 확인
    expect(data.weeks[0][0].level).toBe(0); // #ebedf0
    expect(data.weeks[0][1].level).toBe(1); // #9be9a8
    expect(data.weeks[0][2].level).toBe(2); // #40c463
    expect(data.weeks[0][4].level).toBe(3); // #30a14e
    expect(data.weeks[0][5].level).toBe(4); // #216e39
  });

  it("401 응답이면 토큰 에러를 던진다", async () => {
    process.env.GITHUB_TOKEN = "bad-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })
    );

    await expect(fetchContributions("leafbird")).rejects.toThrow(
      "Invalid GITHUB_TOKEN"
    );
  });

  it("존재하지 않는 사용자이면 에러를 던진다", async () => {
    process.env.GITHUB_TOKEN = "test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { user: null } }),
      })
    );

    await expect(fetchContributions("nobody")).rejects.toThrow("not found");
  });

  it("GraphQL 에러 응답이면 에러를 던진다", async () => {
    process.env.GITHUB_TOKEN = "test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            errors: [{ message: "Something went wrong" }],
          }),
      })
    );

    await expect(fetchContributions("leafbird")).rejects.toThrow(
      "Something went wrong"
    );
  });

  it("GITHUB_TOKEN 없어도 gh auth token으로 토큰을 확보하면 GraphQL을 사용한다", async () => {
    delete process.env.GITHUB_TOKEN;
    vi.mocked(child_process.execSync).mockReturnValue("ghp_from_gh_cli\n");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(fixtureGraphQL),
    });
    vi.stubGlobal("fetch", mockFetch);

    const data = await fetchContributions("leafbird");

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/graphql");
    expect((options.headers as Record<string, string>).Authorization).toBe(
      "bearer ghp_from_gh_cli"
    );
    expect(data.source).toBe("graphql");
  });

  it("source 필드가 GraphQL이면 'graphql'이다", async () => {
    process.env.GITHUB_TOKEN = "test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(fixtureGraphQL),
      })
    );

    const data = await fetchContributions("leafbird");
    expect(data.source).toBe("graphql");
  });

  it("source 필드가 HTML이면 'html'이다", async () => {
    delete process.env.GITHUB_TOKEN;
    vi.mocked(child_process.execSync).mockImplementation(() => {
      throw new Error("command not found: gh");
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(fixtureHTML),
      })
    );

    const data = await fetchContributions("leafbird");
    expect(data.source).toBe("html");
  });
});
