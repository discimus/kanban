import { describe, it, expect, vi, afterEach } from "vitest";
import { isIOSLike, isAppleIOS } from "./platform";

describe("isIOSLike", () => {
  it("detects iPhone via user agent", () => {
    expect(isIOSLike({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", platform: "iPhone", maxTouchPoints: 0 })).toBe(true);
  });

  it("detects iPad via user agent", () => {
    expect(isIOSLike({ userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)", platform: "iPad", maxTouchPoints: 0 })).toBe(true);
  });

  it("detects iPod via user agent", () => {
    expect(isIOSLike({ userAgent: "Mozilla/5.0 (iPod touch; CPU iPhone OS 18_0 like Mac OS X)", platform: "iPod", maxTouchPoints: 0 })).toBe(true);
  });

  it("detects iPadOS 13+ (MacIntel + touch)", () => {
    expect(isIOSLike({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 5 })).toBe(true);
  });

  it("does not flag a desktop Mac without touch", () => {
    expect(isIOSLike({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 0 })).toBe(false);
  });

  it("does not flag Android, Windows or Linux", () => {
    expect(isIOSLike({ userAgent: "Mozilla/5.0 (Linux; Android 14)", platform: "Linux armv8l", maxTouchPoints: 5 })).toBe(false);
    expect(isIOSLike({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32", maxTouchPoints: 5 })).toBe(false);
    expect(isIOSLike({ userAgent: "Mozilla/5.0 (X11; Linux x86_64)", platform: "Linux x86_64", maxTouchPoints: 0 })).toBe(false);
  });
});

describe("isAppleIOS", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when navigator is unavailable", () => {
    vi.stubGlobal("navigator", undefined);
    expect(isAppleIOS()).toBe(false);
  });

  it("reads the current environment", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 0
    });
    expect(isAppleIOS()).toBe(true);
  });

  it("returns false for non-iOS environments", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      platform: "Win32",
      maxTouchPoints: 0
    });
    expect(isAppleIOS()).toBe(false);
  });
});
