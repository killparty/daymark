import { describe, expect, test } from "bun:test";
import { ipInCidrs, parseCidrList } from "../src/server/lib/ip.ts";
import {
  addMonths,
  daysInMonth,
  isIsoDate,
  localDateIn,
  startOfWeek,
} from "../src/shared/dates.ts";

describe("dates", () => {
  test("the day is decided by the timezone of the press", () => {
    const instant = new Date("2026-03-01T23:30:00Z");
    expect(localDateIn("UTC", instant)).toBe("2026-03-01");
    expect(localDateIn("Europe/Zurich", instant)).toBe("2026-03-02");
    expect(localDateIn("America/Los_Angeles", instant)).toBe("2026-03-01");
    expect(localDateIn("Pacific/Kiritimati", new Date("2026-03-01T10:00:00Z"))).toBe("2026-03-02");
  });

  test("validates ISO dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
  });

  test("week and month helpers", () => {
    // 2026-10-10 is a Saturday.
    expect(startOfWeek("2026-10-10", 1)).toBe("2026-10-05");
    expect(startOfWeek("2026-10-10", 0)).toBe("2026-10-04");
    expect(startOfWeek("2026-10-10", 6)).toBe("2026-10-10");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
    expect(daysInMonth("2028-02-10")).toBe(29);
  });
});

describe("trusted proxies", () => {
  const cidrs = parseCidrList("127.0.0.0/8,172.16.0.0/12,::1/128,fd00::/8");
  test.each([
    ["127.0.0.1", true],
    ["172.20.0.5", true],
    ["::ffff:172.20.0.5", true],
    ["::1", true],
    ["fd12:3456::1", true],
    ["8.8.8.8", false],
    ["172.32.0.1", false],
    ["2001:db8::1", false],
    ["garbage", false],
  ])("%s → %p", (ip, expected) => {
    expect(ipInCidrs(ip, cidrs)).toBe(expected);
  });
});
