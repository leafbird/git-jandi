import type { ContributionData, DayData, WeekData } from "./types.js";

const CONTRIBUTIONS_URL = "https://github.com/users/{username}/contributions";

/**
 * GitHub contributions 페이지를 가져와 파싱한다.
 * 토큰 불필요 — public HTML 스크래핑.
 */
export async function fetchContributions(
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

  return { total, weeks };
}
