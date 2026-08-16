import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAudioPlaybackUrl, releaseAudioPlaybackUrl, clearAudioPlaybackUrls } from "./audio-url";

const created: string[] = [];
const revoked: string[] = [];
let counter = 0;

beforeEach(() => {
  created.length = 0;
  revoked.length = 0;
  counter = 0;
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn((_blob: Blob) => {
      const url = `blob:kanban-${counter++}`;
      created.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn((url: string) => { revoked.push(url); })
  });
});

afterEach(() => {
  clearAudioPlaybackUrls();
  vi.unstubAllGlobals();
});

const DATA_URL = "data:audio/webm;base64,aGVsbG8=";

describe("getAudioPlaybackUrl", () => {
  it("returns an object URL for a data URL", () => {
    const url = getAudioPlaybackUrl(DATA_URL);
    expect(url).toMatch(/^blob:/);
    expect(created).toHaveLength(1);
  });

  it("returns an empty string for an empty data URL", () => {
    expect(getAudioPlaybackUrl("")).toBe("");
    expect(created).toHaveLength(0);
  });

  it("caches the object URL per data URL", () => {
    const first = getAudioPlaybackUrl(DATA_URL);
    const second = getAudioPlaybackUrl(DATA_URL);
    expect(second).toBe(first);
    expect(created).toHaveLength(1);
  });
});

describe("releaseAudioPlaybackUrl", () => {
  it("revokes the cached object URL and removes it from the cache", () => {
    const url = getAudioPlaybackUrl(DATA_URL);
    releaseAudioPlaybackUrl(DATA_URL);
    expect(revoked).toEqual([url]);

    const again = getAudioPlaybackUrl(DATA_URL);
    expect(again).not.toBe(url);
    expect(created).toHaveLength(2);
  });

  it("produces a fresh URL on every render cycle (release-then-recreate)", () => {
    const first = getAudioPlaybackUrl(DATA_URL);
    releaseAudioPlaybackUrl(DATA_URL);
    const second = getAudioPlaybackUrl(DATA_URL);
    releaseAudioPlaybackUrl(DATA_URL);
    const third = getAudioPlaybackUrl(DATA_URL);

    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
    expect(created).toHaveLength(3);
    expect(revoked).toEqual([first, second]);
  });

  it("releasing before a rebuild never hands back a revoked URL", () => {
    const urls = new Set<string>();
    for (let i = 0; i < 3; i++) {
      urls.add(getAudioPlaybackUrl(DATA_URL));
      releaseAudioPlaybackUrl(DATA_URL);
    }
    expect(urls.size).toBe(3);
  });

  it("is a no-op for an unknown data URL", () => {
    expect(() => releaseAudioPlaybackUrl(DATA_URL)).not.toThrow();
    expect(revoked).toHaveLength(0);
  });
});

describe("clearAudioPlaybackUrls", () => {
  it("revokes every cached object URL", () => {
    const a = getAudioPlaybackUrl(DATA_URL);
    const b = getAudioPlaybackUrl("data:audio/mp4;base64,QUFB");
    clearAudioPlaybackUrls();
    expect(revoked).toEqual([a, b]);
  });
});

describe("getAudioPlaybackUrl mime fallback", () => {
  it("types the blob with the provided mimeType when the data URL carries none", () => {
    let lastBlobType = "";
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        lastBlobType = blob.type;
        return "blob:mime-fallback";
      }),
      revokeObjectURL: vi.fn()
    });

    const url = getAudioPlaybackUrl("data:;base64,Y2FyYW9m", "audio/wav");
    expect(url).toBe("blob:mime-fallback");
    expect(lastBlobType).toBe("audio/wav");
  });

  it("prefers the mime embedded in the data URL over the fallback", () => {
    let lastBlobType = "";
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        lastBlobType = blob.type;
        return "blob:mime-embedded";
      }),
      revokeObjectURL: vi.fn()
    });

    getAudioPlaybackUrl("data:audio/mp4;base64,YmFubmFuYQ==", "audio/wav");
    expect(lastBlobType).toBe("audio/mp4");
  });
});
