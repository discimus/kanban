import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAudioPlayer } from "./audio-player";

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
  listeners: Record<string, Array<() => void>>;
  setAttribute: (key: string, value: string) => void;
  getAttribute: (key: string) => string | null;
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
    listeners: {},
    setAttribute: (key, value) => { node.attrs[key] = value; },
    getAttribute: (key) => node.attrs[key] ?? null,
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

function makeControls(onError?: () => void) {
  const controls = createAudioPlayer(DATA_URL, onError);
  return {
    player: controls.player as unknown as FakeNode,
    playBtn: controls.playBtn as unknown as FakeNode
  };
}

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
