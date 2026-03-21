import { execSync } from "child_process";
import type { ContributionData, DayData, WeekData } from "./types.js";

const CONTRIBUTIONS_URL = "https://github.com/users/{username}/contributions";
const GRAPHQL_URL = "https://api.github.com/graphql";

const GRAPHQL_QUERY = `
query($userName: String!) {
  user(login: $userName) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
            color
          }
        }
      }
    }
  }
}`;

/** GitHub contribution 색상 → level(0-4) 매핑 */
export const COLOR_TO_LEVEL: Record<string, number> = {
  "#ebedf0": 0,
  "#9be9a8": 1,
  "#40c463": 2,
  "#30a14e": 3,
  "#216e39": 4,
};

interface GraphQLResponse {
  data?: {
    user?: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: Array<{
            contributionDays: Array<{
              contributionCount: number;
              date: string;
              color: string;
            }>;
          }>;
        };
      };
    };
  };
  errors?: Array<{ message: string }>;
}

/**
 * 토큰을 확보하여 GraphQL API로 가져오거나, 실패 시 다음 단계로 fallback.
 * 순서: GITHUB_TOKEN → gh auth token → HTML scraping
 */
export async function fetchContributions(
  username: string
): Promise<ContributionData> {
  const envToken = process.env.GITHUB_TOKEN;
  if (envToken) {
    try {
      return await fetchContributionsGraphQL(username, envToken);
    } catch {
      // GITHUB_TOKEN 실패 → gh auth token으로 fallback
    }
  }

  const ghToken = getGhAuthToken();
  if (ghToken) {
    try {
      return await fetchContributionsGraphQL(username, ghToken);
    } catch {
      // gh auth token 실패 → HTML로 fallback
    }
  }

  return fetchContributionsHTML(username);
}

/** gh CLI에서 인증 토큰을 가져온다. 실패 시 null 반환. */
function getGhAuthToken(): string | null {
  try {
    return execSync("gh auth token", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim() || null;
  } catch {
    return null;
  }
}

async function fetchContributionsGraphQL(
  username: string,
  token: string
): Promise<ContributionData> {
  let json: GraphQLResponse;
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "git-jandi",
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: { userName: username },
      }),
    });

    if (res.status === 401) {
      throw new Error(
        "Invalid GITHUB_TOKEN. Check your token and try again."
      );
    }
    if (!res.ok) {
      throw new Error(`GitHub API error: HTTP ${res.status}`);
    }

    json = (await res.json()) as GraphQLResponse;
  } catch (err) {
    if (err instanceof Error && err.message.includes("GITHUB_TOKEN"))
      throw err;
    if (err instanceof Error && err.message.includes("GitHub API"))
      throw err;
    throw new Error(
      "Failed to fetch contributions. Check your network connection."
    );
  }

  if (json.errors?.length) {
    throw new Error(`GitHub API error: ${json.errors[0].message}`);
  }

  if (!json.data?.user) {
    throw new Error(`User "${username}" not found`);
  }

  const calendar =
    json.data.user.contributionsCollection.contributionCalendar;

  const weeks: WeekData[] = calendar.weeks.map((week) =>
    week.contributionDays.map((day) => ({
      date: day.date,
      level: COLOR_TO_LEVEL[day.color] ?? 0,
    }))
  );

  return { total: calendar.totalContributions, weeks, source: "graphql" };
}

async function fetchContributionsHTML(
  username: string
): Promise<ContributionData> {
  const url = CONTRIBUTIONS_URL.replace("{username}", username);

  let html: string;
  try {
    const res = await fetch(url);
    if (res.status === 404) {
      throw new Error(`User "${username}" not found`);
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    html = await res.text();
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) throw err;
    throw new Error(
      "Failed to fetch contributions. Check your network connection."
    );
  }

  return parseHTML(html);
}

/**
 * GitHub contributions HTML에서 data-date, data-level을 추출한다.
 *
 * HTML 구조: 요일별 <tr> (각 행 = 한 요일의 모든 주)
 * 우리가 원하는 구조: 주별 배열 (각 배열 = 한 주의 7일)
 */
export function parseHTML(html: string): ContributionData {
  // 총 contribution 수 추출
  const totalMatch = html.match(
    /(\d[\d,]*)\s*\n?\s*contributions?\s+in the last year/i
  );
  const total = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ""), 10) : 0;

  // 모든 <td>에서 data-date, data-level 추출
  const dayRegex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"/g;
  const days: DayData[] = [];
  let match: RegExpExecArray | null;

  while ((match = dayRegex.exec(html)) !== null) {
    days.push({
      date: match[1],
      level: parseInt(match[2], 10),
    });
  }

  if (days.length === 0) {
    throw new Error(
      "Failed to parse contribution data. GitHub page format may have changed."
    );
  }

  // 날짜순 정렬
  days.sort((a, b) => a.date.localeCompare(b.date));

  // 7일 단위로 주(week) 그룹핑
  // GitHub 그래프는 일요일 시작이므로 첫 날짜의 요일 기준으로 그룹핑
  const weeks: WeekData[] = [];
  let currentWeek: WeekData = [];

  for (const day of days) {
    const dow = new Date(day.date + "T00:00:00").getDay(); // 0=일 6=토
    if (dow === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return { total, weeks, source: "html" };
}
