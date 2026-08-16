import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAudioPlayer, computeAudioProgress } from "./audio-player";

// ---------------------------------------------------------------------------
// audio-player.ts depends on DOM APIs only at call time. We stub document and
// URL.createObjectURL, mirroring the approach used by dom.test.ts.
// ---------------------------------------------------------------------------

interface FakeNode {
  tagName: string;
  attrs: Record<string, string>;
  className: string;
  children: FakeNode[];
  textContent: string;
  ended: boolean;
  currentTime: number;
  duration: number;
  listeners: Record<string, Array<() => void>>;
  setAttribute: (key: string, value: string) => void;
  getAttribute: (key: string) => string | null;
  removeAttribute: (key: string) => void;
  append: (...children: unknown[]) => void;
  addEventListener: (event: string, cb: () => void) => void;
  dispatch: (event: string) => void;
  querySelector: (selector: string) => FakeNode | null;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}

const iconText = { textContent: "" };

function makeNode(tag: string): FakeNode {
  const node: FakeNode = {
    tagName: tag,
    attrs: {},
    className: "",
    children: [],
    textContent: "",
    ended: false,
    currentTime: 0,
    duration: NaN,
    listeners: {},
    setAttribute: (key, value) => { node.attrs[key] = value; },
    getAttribute: (key) => node.attrs[key] ?? null,
    removeAttribute: (key) => { delete node.attrs[key]; },
    append: (...children) => { node.children.push(...(children as FakeNode[])); },
    addEventListener: (event, cb) => { (node.listeners[event] ??= []).push(cb); },
    dispatch: (event) => { for (const cb of node.listeners[event] ?? []) cb(); },
    querySelector: () => (tag === "button" ? (iconText as unknown as FakeNode) : null),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn()
  };
  return node;
}

beforeEach(() => {
  iconText.textContent = "";
  vi.stubGlobal("document", {
    createElement: (tag: string) => makeNode(tag),
    createTextNode: () => ({})
  });
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:audio"),
    revokeObjectURL: vi.fn()
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const DATA_URL = "data:audio/webm;base64,aGVsbG8=";

function makeControls(onError?: () => void, knownDuration?: number) {
  const controls = createAudioPlayer(DATA_URL, onError, knownDuration);
  return {
    player: controls.player as unknown as FakeNode,
    playBtn: controls.playBtn as unknown as FakeNode,
    progressBar: controls.progressBar as unknown as FakeNode,
    durationEl: controls.durationEl as unknown as FakeNode,
    progressFill: (controls.progressBar as unknown as FakeNode).children[0] as FakeNode
  };
}

/** Captures requestAnimationFrame callbacks so tests can step frames manually. */
function stubRaf() {
  const frames: FrameRequestCallback[] = [];
  const cancel = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", cancel);
  return { frames, cancel };
}

describe("computeAudioProgress", () => {
  it("computes percent and remaining for a partial position", () => {
    expect(computeAudioProgress(10, 4)).toEqual({ percent: 0.4, remaining: 6 });
  });

  it("clamps at the start of the track", () => {
    expect(computeAudioProgress(10, 0)).toEqual({ percent: 0, remaining: 10 });
  });

  it("clamps past the end of the track", () => {
    expect(computeAudioProgress(10, 12)).toEqual({ percent: 1, remaining: 0 });
  });

  it("handles unknown duration (NaN/Infinity) safely", () => {
    expect(computeAudioProgress(NaN, 3)).toEqual({ percent: 0, remaining: 0 });
    expect(computeAudioProgress(Infinity, 3)).toEqual({ percent: 0, remaining: 0 });
  });

  it("handles negative and NaN currentTime", () => {
    expect(computeAudioProgress(10, -2)).toEqual({ percent: 0, remaining: 10 });
    expect(computeAudioProgress(10, NaN)).toEqual({ percent: 0, remaining: 10 });
  });

  it("handles a zero total", () => {
    expect(computeAudioProgress(0, 0)).toEqual({ percent: 0, remaining: 0 });
  });
});

describe("createAudioPlayer", () => {
  it("wires the player src to an object URL", () => {
    const { player } = makeControls();
    expect(player.attrs["src"]).toBe("blob:audio");
  });

  it("clicking play calls player.play()", () => {
    const { player, playBtn } = makeControls();
    playBtn.dispatch("click");
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it("clicking while playing pauses instead of replaying", () => {
    const { player, playBtn } = makeControls();
    player.dispatch("play");
    playBtn.dispatch("click");
    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(player.play).not.toHaveBeenCalled();
  });

  it("resets currentTime before replaying an ended audio", () => {
    const { player, playBtn } = makeControls();
    player.ended = true;
    player.currentTime = 8;
    playBtn.dispatch("click");
    expect(player.currentTime).toBe(0);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it("surfaces a play() rejection through onError", async () => {
    const onError = vi.fn();
    const { player, playBtn } = makeControls(onError);
    player.play.mockRejectedValue(new Error("decode failed"));
    playBtn.dispatch("click");
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it("reflects playback state on the play icon", () => {
    const { player } = makeControls();
    player.dispatch("play");
    expect(iconText.textContent).toBe("pause");
    player.dispatch("pause");
    expect(iconText.textContent).toBe("play_arrow");
  });
});

describe("createAudioPlayer progress", () => {
  it("shows the total duration and keeps the bar hidden at rest", () => {
    const { progressBar, durationEl } = makeControls(undefined, 10);
    expect(durationEl.textContent).toBe("00:10");
    expect(durationEl.className).toBe("card__audio-duration");
    expect(progressBar.attrs["hidden"]).toBe("");
  });

  it("reveals the bar and shows remaining time while playing", () => {
    const { frames } = stubRaf();
    const { player, progressBar, durationEl, progressFill } = makeControls(undefined, 10);
    player.duration = 10;
    player.dispatch("play");

    expect(progressBar.attrs["hidden"]).toBeUndefined();
    expect(durationEl.className).toBe("card__audio-duration card__audio-duration--remaining");

    player.currentTime = 4;
    frames[0]!(16);
    expect(progressFill.attrs["style"]).toBe("width:40%");
    expect(durationEl.textContent).toBe("\u201300:06");
    expect(progressBar.attrs["aria-valuenow"]).toBe("4");
    expect(progressBar.attrs["aria-valuemax"]).toBe("10");
  });

  it("falls back to the recorded duration while player.duration is unknown", () => {
    const { frames } = stubRaf();
    const { player, progressFill, durationEl } = makeControls(undefined, 8);
    player.dispatch("play");
    player.currentTime = 2;
    frames[0]!(16);
    expect(progressFill.attrs["style"]).toBe("width:25%");
    expect(durationEl.textContent).toBe("\u201300:06");
  });

  it("hides the bar and restores the total duration on pause", () => {
    const { cancel } = stubRaf();
    const { player, progressBar, durationEl } = makeControls(undefined, 10);
    player.duration = 10;
    player.dispatch("play");
    player.currentTime = 5;
    player.dispatch("pause");
    expect(progressBar.attrs["hidden"]).toBe("");
    expect(durationEl.textContent).toBe("00:10");
    expect(durationEl.className).toBe("card__audio-duration");
    expect(cancel).toHaveBeenCalled();
  });

  it("hides the bar and restores the total duration when playback ends", () => {
    stubRaf();
    const { player, progressBar, durationEl } = makeControls(undefined, 10);
    player.duration = 10;
    player.dispatch("play");
    player.dispatch("ended");
    expect(progressBar.attrs["hidden"]).toBe("");
    expect(durationEl.textContent).toBe("00:10");
  });

  it("marks the progressbar for assistive tech as a progressbar", () => {
    const { progressBar } = makeControls();
    expect(progressBar.attrs["role"]).toBe("progressbar");
    expect(progressBar.attrs["aria-valuemin"]).toBe("0");
    expect(progressBar.attrs["aria-label"]).toBeTruthy();
  });
});
