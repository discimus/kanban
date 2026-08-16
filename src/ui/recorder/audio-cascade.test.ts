import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { createAudioCascade, type CascadeEntry } from "./audio-cascade";

// ---------------------------------------------------------------------------
// audio-cascade.ts is a pure orchestrator: it only needs players with
// addEventListener/play/pause and rows with classList/isConnected. Timers go
// through globalThis.setTimeout, so vi.useFakeTimers() drives the cascade.
// ---------------------------------------------------------------------------

interface FakePlayer {
  paused: boolean;
  ended: boolean;
  listeners: Record<string, Array<() => void>>;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  addEventListener: (event: string, cb: () => void) => void;
  dispatch: (event: string) => void;
}

function makePlayer(): FakePlayer {
  const player: FakePlayer = {
    paused: true,
    ended: false,
    listeners: {},
    play: vi.fn(() => {
      player.paused = false;
      return Promise.resolve();
    }),
    pause: vi.fn(() => {
      player.paused = true;
    }),
    addEventListener: (event, cb) => { (player.listeners[event] ??= []).push(cb); },
    dispatch: (event) => {
      for (const cb of player.listeners[event] ?? []) cb();
    }
  };
  return player;
}

interface FakeRow {
  isConnected: boolean;
  classList: {
    add: (className: string) => void;
    remove: (className: string) => void;
    contains: (className: string) => boolean;
  };
}

function makeRow(): FakeRow {
  const classes = new Set<string>();
  return {
    isConnected: true,
    classList: {
      add: (className) => { classes.add(className); },
      remove: (className) => { classes.delete(className); },
      contains: (className) => classes.has(className)
    }
  };
}

const NEXT_CLASS = "card__audio--next";

interface Fixture {
  cascade: ReturnType<typeof createAudioCascade>;
  players: FakePlayer[];
  rows: FakeRow[];
  onError: Mock<() => void>;
}

function makeFixture(count: number, onError?: Mock<() => void>): Fixture {
  const players = Array.from({ length: count }, makePlayer);
  const rows = Array.from({ length: count }, makeRow);
  const entries: CascadeEntry[] = players.map((p, i) => ({
    player: p as unknown as HTMLAudioElement,
    playBtn: {} as unknown as HTMLButtonElement,
    row: rows[i] as unknown as HTMLElement
  }));
  const errorHandler = (onError ?? vi.fn()) as Mock<() => void>;
  const cascade = createAudioCascade(entries, { onError: errorHandler });
  return {
    cascade,
    players,
    rows,
    onError: errorHandler
  };
}

/** User starts track `i`: play fires without any auto-start flag in place. */
function userStarts(fixture: Fixture, i: number): void {
  fixture.players[i].dispatch("play");
}

/** The media element for track `i` reaches its end. */
function ends(fixture: Fixture, i: number): void {
  const player = fixture.players[i];
  player.ended = true;
  player.dispatch("ended");
}

describe("createAudioCascade", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-plays only the tracks below the started one, in sequence", () => {
    const fixture = makeFixture(3);
    userStarts(fixture, 0);

    ends(fixture, 0);
    vi.advanceTimersByTime(300);
    expect(fixture.players[1].play).toHaveBeenCalledTimes(1);

    ends(fixture, 1);
    vi.advanceTimersByTime(300);
    expect(fixture.players[2].play).toHaveBeenCalledTimes(1);
    expect(fixture.players[0].play).not.toHaveBeenCalled();
  });

  it("never auto-plays a track above the anchor", () => {
    const fixture = makeFixture(3);
    userStarts(fixture, 1);

    ends(fixture, 1);
    vi.advanceTimersByTime(300);
    expect(fixture.players[2].play).toHaveBeenCalledTimes(1);
    expect(fixture.players[0].play).not.toHaveBeenCalled();
  });

  it("stops silently at the end of the list", () => {
    const fixture = makeFixture(2);
    userStarts(fixture, 0);

    ends(fixture, 0);
    vi.advanceTimersByTime(300);
    expect(fixture.players[1].play).toHaveBeenCalledTimes(1);

    ends(fixture, 1);
    vi.advanceTimersByTime(300);
    expect(fixture.players[1].play).toHaveBeenCalledTimes(1);
    expect(fixture.onError).not.toHaveBeenCalled();
  });

  it("switching to another track cancels the pending auto-start", () => {
    const fixture = makeFixture(3);
    userStarts(fixture, 0);
    ends(fixture, 0);

    userStarts(fixture, 2);
    vi.advanceTimersByTime(300);
    expect(fixture.players[1].play).not.toHaveBeenCalled();
  });

  it("pausing the active track (not ended) cancels the cascade", () => {
    const fixture = makeFixture(3);
    userStarts(fixture, 0);
    ends(fixture, 0);

    fixture.players[0].paused = false;
    fixture.players[0].ended = false;
    fixture.players[0].dispatch("pause");

    vi.advanceTimersByTime(300);
    expect(fixture.players[1].play).not.toHaveBeenCalled();
  });

  it("a pause fired after ended does not cancel the scheduled next track", () => {
    const fixture = makeFixture(2);
    userStarts(fixture, 0);
    ends(fixture, 0);

    fixture.players[0].dispatch("pause");

    vi.advanceTimersByTime(300);
    expect(fixture.players[1].play).toHaveBeenCalledTimes(1);
  });

  it("surfaces an autoplay failure once and stops the cascade", async () => {
    const onError = vi.fn();
    const fixture = makeFixture(3, onError);
    userStarts(fixture, 0);
    ends(fixture, 0);

    fixture.players[1].play.mockRejectedValue(new Error("not allowed"));
    vi.advanceTimersByTime(300);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(fixture.players[1].play).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    expect(fixture.players[2].play).not.toHaveBeenCalled();
  });

  it("highlights the next-up row while scheduled and clears it when it starts", () => {
    const fixture = makeFixture(2);
    userStarts(fixture, 0);
    ends(fixture, 0);
    expect(fixture.rows[1].classList.contains(NEXT_CLASS)).toBe(true);

    vi.advanceTimersByTime(300);
    expect(fixture.rows[1].classList.contains(NEXT_CLASS)).toBe(false);
  });

  it("clears the highlight when the user starts a different track", () => {
    const fixture = makeFixture(3);
    userStarts(fixture, 0);
    ends(fixture, 0);
    expect(fixture.rows[1].classList.contains(NEXT_CLASS)).toBe(true);

    userStarts(fixture, 2);
    expect(fixture.rows[1].classList.contains(NEXT_CLASS)).toBe(false);
  });

  it("replaying the same track does not duplicate the queue", () => {
    const fixture = makeFixture(2);
    userStarts(fixture, 0);
    ends(fixture, 0);

    userStarts(fixture, 0);
    vi.advanceTimersByTime(300);
    expect(fixture.players[1].play).not.toHaveBeenCalled();

    ends(fixture, 0);
    vi.advanceTimersByTime(300);
    expect(fixture.players[1].play).toHaveBeenCalledTimes(1);
  });

  it("stop() cancels the pending auto-start and clears the highlight", () => {
    const fixture = makeFixture(2);
    userStarts(fixture, 0);
    ends(fixture, 0);
    expect(fixture.rows[1].classList.contains(NEXT_CLASS)).toBe(true);

    fixture.cascade.stop();
    expect(fixture.rows[1].classList.contains(NEXT_CLASS)).toBe(false);

    vi.advanceTimersByTime(300);
    expect(fixture.players[1].play).not.toHaveBeenCalled();
  });

  it("never auto-starts a track on a detached row", () => {
    const fixture = makeFixture(2);
    userStarts(fixture, 0);
    ends(fixture, 0);

    fixture.rows[1].isConnected = false;
    vi.advanceTimersByTime(300);
    expect(fixture.players[1].play).not.toHaveBeenCalled();
  });
});
