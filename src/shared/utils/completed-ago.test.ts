import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { completedAgo } from "@shared/utils";

const NOW = new Date("2026-06-15T12:00:00.000Z").getTime();

function isoAgo(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

describe("completedAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty string for null", () => {
    expect(completedAgo(null)).toBe("");
  });

  it("returns empty string for an invalid date", () => {
    expect(completedAgo("invalid")).toBe("");
  });

  it("returns 'Concluído agora' for a future date", () => {
    expect(completedAgo(new Date(NOW + 10000).toISOString())).toBe("Concluído agora");
  });

  it("returns 'Concluído agora' under one minute", () => {
    expect(completedAgo(isoAgo(30 * 1000))).toBe("Concluído agora");
  });

  it("returns singular minute", () => {
    expect(completedAgo(isoAgo(60 * 1000))).toBe("Concluído há 1 minuto");
  });

  it("returns plural minutes", () => {
    expect(completedAgo(isoAgo(5 * 60 * 1000))).toBe("Concluído há 5 minutos");
  });

  it("returns singular hour", () => {
    expect(completedAgo(isoAgo(3600 * 1000))).toBe("Concluído há 1 hora");
  });

  it("returns plural hours", () => {
    expect(completedAgo(isoAgo(3 * 3600 * 1000))).toBe("Concluído há 3 horas");
  });

  it("returns singular day", () => {
    expect(completedAgo(isoAgo(86400 * 1000))).toBe("Concluído há 1 dia");
  });

  it("returns plural days", () => {
    expect(completedAgo(isoAgo(2 * 86400 * 1000))).toBe("Concluído há 2 dias");
  });

  it("returns singular month", () => {
    expect(completedAgo(isoAgo(30 * 86400 * 1000))).toBe("Concluído há 1 mês");
  });

  it("returns plural months", () => {
    expect(completedAgo(isoAgo(61 * 86400 * 1000))).toBe("Concluído há 2 meses");
  });

  it("returns singular year", () => {
    expect(completedAgo(isoAgo(365 * 86400 * 1000))).toBe("Concluído há 1 ano");
  });

  it("returns plural years", () => {
    expect(completedAgo(isoAgo(730 * 86400 * 1000))).toBe("Concluído há 2 anos");
  });
});
