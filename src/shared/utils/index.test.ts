import { describe, it, expect } from "vitest";
import { uuid, nowISO, formatDate, toDateInputValue, fromDateInputValue, timeAgo, linkify } from "@shared/utils";

describe("uuid", () => {
  it("returns a non-empty string", () => {
    const result = uuid();
    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a string in UUID-like format (8-4-4-4-12 hex chars with dashes)", () => {
    const result = uuid();
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("returns unique values on multiple calls", () => {
    const results = new Set(Array.from({ length: 50 }, () => uuid()));
    expect(results.size).toBe(50);
  });
});

describe("nowISO", () => {
  it("returns a string in ISO 8601 format", () => {
    const result = nowISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("ends with 'Z'", () => {
    const result = nowISO();
    expect(result.endsWith("Z")).toBe(true);
  });
});

describe("formatDate", () => {
  it("returns a string containing numbers/slashes for a valid date", () => {
    const result = formatDate("2024-03-15T10:00:00.000Z");
    expect(result).toMatch(/\d/);
    expect(result).toMatch(/\//);
  });

  it("returns '—' for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns '—' for an invalid date", () => {
    expect(formatDate("invalid")).toBe("—");
  });
});

describe("timeAgo", () => {
  it("returns empty string for null", () => {
    expect(timeAgo(null)).toBe("");
  });

  it('returns "Visitado agora" for a recent date', () => {
    const recent = new Date(Date.now() - 1000).toISOString();
    expect(timeAgo(recent)).toBe("Visitado agora");
  });

  it('returns "Visitado agora" for a future date', () => {
    const future = new Date(Date.now() + 10000).toISOString();
    expect(timeAgo(future)).toBe("Visitado agora");
  });

  it("returns minutes for a few minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("Visitado há 5 minutos");
  });

  it("returns singular minute", () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    expect(timeAgo(oneMinAgo)).toBe("Visitado há 1 minuto");
  });

  it("returns hours for a few hours ago", () => {
    const threeHrAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(timeAgo(threeHrAgo)).toBe("Visitado há 3 horas");
  });

  it("returns singular hour", () => {
    const oneHrAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    expect(timeAgo(oneHrAgo)).toBe("Visitado há 1 hora");
  });

  it("returns days for more than 24h", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
    expect(timeAgo(twoDaysAgo)).toBe("Visitado há 2 dias");
  });

  it("returns singular day", () => {
    const oneDayAgo = new Date(Date.now() - 86400 * 1000).toISOString();
    expect(timeAgo(oneDayAgo)).toBe("Visitado há 1 dia");
  });

  it("returns months for > 30 days", () => {
    const twoMonthsAgo = new Date(Date.now() - 61 * 86400 * 1000).toISOString();
    expect(timeAgo(twoMonthsAgo)).toBe("Visitado há 2 meses");
  });

  it("returns anos for > 12 months", () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 86400 * 1000).toISOString();
    expect(timeAgo(twoYearsAgo)).toBe("Visitado há 2 anos");
  });
});

describe("toDateInputValue", () => {
  it("returns '2024-03-15' for a full ISO string", () => {
    expect(toDateInputValue("2024-03-15T10:00:00.000Z")).toBe("2024-03-15");
  });

  it("returns '' for null", () => {
    expect(toDateInputValue(null)).toBe("");
  });
});

describe("fromDateInputValue", () => {
  it("returns null for an empty string", () => {
    expect(fromDateInputValue("")).toBeNull();
  });

  it("returns an ISO string for a valid date input", () => {
    const result = fromDateInputValue("2024-03-15");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe("linkify", () => {
  it("returns a single text part when there is no URL", () => {
    expect(linkify("apenas texto")).toEqual([{ text: "apenas texto" }]);
  });

  it("returns an empty array for an empty string", () => {
    expect(linkify("")).toEqual([]);
  });

  it("links an https URL inside a sentence", () => {
    expect(linkify("veja https://exemplo.com agora")).toEqual([
      { text: "veja " },
      { text: "https://exemplo.com", url: "https://exemplo.com" },
      { text: " agora" }
    ]);
  });

  it("normalizes www without a scheme to https", () => {
    expect(linkify("www.exemplo.com")).toEqual([
      { text: "www.exemplo.com", url: "https://www.exemplo.com" }
    ]);
  });

  it("keeps query punctuation intact", () => {
    expect(linkify("https://x.com/busca?q=a,b")).toEqual([
      { text: "https://x.com/busca?q=a,b", url: "https://x.com/busca?q=a,b" }
    ]);
  });

  it("strips trailing sentence punctuation from the URL and keeps it as text", () => {
    expect(linkify("veja https://x.com.")).toEqual([
      { text: "veja " },
      { text: "https://x.com", url: "https://x.com" },
      { text: "." }
    ]);
  });

  it("strips an unbalanced closing paren", () => {
    expect(linkify("https://x.com)")).toEqual([
      { text: "https://x.com", url: "https://x.com" },
      { text: ")" }
    ]);
  });

  it("keeps balanced parens inside the URL", () => {
    expect(linkify("https://en.wikipedia.org/wiki/Foo_(bar)")).toEqual([
      { text: "https://en.wikipedia.org/wiki/Foo_(bar)", url: "https://en.wikipedia.org/wiki/Foo_(bar)" }
    ]);
  });

  it("handles multiple URLs in one cell", () => {
    expect(linkify("https://a.com e www.b.com")).toEqual([
      { text: "https://a.com", url: "https://a.com" },
      { text: " e " },
      { text: "www.b.com", url: "https://www.b.com" }
    ]);
  });
});
