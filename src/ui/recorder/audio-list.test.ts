import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderAudioList, type CardAudio } from "./audio-list";
import { formatPlaybackRate } from "./audio-speed";

/**
 * renderAudioList touches DOM only at call time, mirroring the stubbing
 * approach used by audio-player.test.ts (no jsdom dependency).
 */
interface FakeNode {
  tagName: string;
  attrs: Record<string, string>;
  className: string;
  children: FakeNode[];
  textContent: string;
  playbackRate: number;
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
    playbackRate: 1,
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

function audio(id: string): CardAudio {
  return { id, dataUrl: "data:audio/webm;base64,aGVsbG8=", filename: `${id}.webm`, mimeType: "audio/webm", duration: 10 };
}

function makeList(audios: CardAudio[], initialRate = 1) {
  const list = document.createElement("div") as unknown as FakeNode;
  const onRateChange = vi.fn();
  const onDelete = vi.fn();
  const onDownload = vi.fn();
  const onError = vi.fn();
  renderAudioList(list as unknown as HTMLElement, {
    audios,
    readOnly: false,
    initialRate,
    onRateChange,
    onDelete,
    onDownload,
    onError
  });
  return { list, onRateChange, onDelete, onDownload, onError };
}

function speedPill(list: FakeNode): FakeNode | undefined {
  return list.children.find((c) => c.className === "card__audio-speed");
}

function players(list: FakeNode): FakeNode[] {
  const found: FakeNode[] = [];
  for (const row of list.children) {
    if (!row.className.includes("card__audio") || row.className === "card__audio-speed") continue;
    const player = row.children.find((c) => c.tagName === "audio");
    if (player) found.push(player);
  }
  return found;
}

describe("renderAudioList speed control", () => {
  it("renders no speed pill when the card has no audio", () => {
    const { list } = makeList([]);
    expect(speedPill(list)).toBeUndefined();
    expect(players(list)).toHaveLength(0);
  });

  it("applies the initial rate to every player", () => {
    const { list } = makeList([audio("a"), audio("b")], 1.5);
    for (const player of players(list)) {
      expect(player.playbackRate).toBe(1.5);
    }
  });

  it("starts the pill at the initial rate", () => {
    const { list } = makeList([audio("a")], 2);
    expect(speedPill(list)?.attrs["aria-label"]).toContain(formatPlaybackRate(2));
  });

  it("cycles 1 -> 1.5 -> 2 -> 1 on tap and applies the rate to all players", () => {
    const { list, onRateChange } = makeList([audio("a"), audio("b")], 1);
    const pill = speedPill(list)!;

    pill.dispatch("click");
    expect(pill.textContent).toBe(formatPlaybackRate(1.5));
    expect(onRateChange).toHaveBeenLastCalledWith(1.5);
    for (const player of players(list)) expect(player.playbackRate).toBe(1.5);

    pill.dispatch("click");
    expect(pill.textContent).toBe(formatPlaybackRate(2));
    for (const player of players(list)) expect(player.playbackRate).toBe(2);

    pill.dispatch("click");
    expect(pill.textContent).toBe(formatPlaybackRate(1));
    for (const player of players(list)) expect(player.playbackRate).toBe(1);
  });

  it("exposes the current speed through the accessible label", () => {
    const { list } = makeList([audio("a")], 1);
    const pill = speedPill(list)!;
    const initialLabel = pill.attrs["aria-label"];
    expect(initialLabel).toContain(formatPlaybackRate(1));
    pill.dispatch("click");
    expect(pill.attrs["aria-label"]).toContain(formatPlaybackRate(1.5));
  });
});
