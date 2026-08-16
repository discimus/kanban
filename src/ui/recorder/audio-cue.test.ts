import { describe, it, expect, vi, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// audio-cue.ts keeps a module-scoped shared AudioContext, so every test loads
// a fresh module instance (vi.resetModules + dynamic import) to control both
// the singleton state and the stubbed Web Audio globals.
// ---------------------------------------------------------------------------

interface FakeAudioContextFixture {
  Constructor: ReturnType<typeof vi.fn>;
  oscillator: {
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    addEventListener: (event: string, cb: () => void) => void;
    end: () => void;
  };
  gainNode: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    gain: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> };
  };
  resume: ReturnType<typeof vi.fn>;
}

function makeFakeAudioContext(initialState = "running"): FakeAudioContextFixture {
  const oscDisconnect = vi.fn();
  const gainDisconnect = vi.fn();
  const endedListeners: Array<() => void> = [];

  const oscillator = {
    type: "",
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: oscDisconnect,
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: (event: string, cb: () => void) => {
      if (event === "ended") endedListeners.push(cb);
    },
    end: () => {
      for (const cb of endedListeners) cb();
    }
  };

  const gainNode = {
    connect: vi.fn(),
    disconnect: gainDisconnect,
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    }
  };

  const resume = vi.fn(function (this: { state: string }) {
    this.state = "running";
    return Promise.resolve();
  });

  const Constructor = vi.fn(function (this: {
    state: string;
    currentTime: number;
    destination: object;
    createOscillator: () => FakeAudioContextFixture["oscillator"];
    createGain: () => FakeAudioContextFixture["gainNode"];
    resume: () => Promise<void>;
  }) {
    this.state = initialState;
    this.currentTime = 0;
    this.destination = {};
    this.createOscillator = () => oscillator;
    this.createGain = () => gainNode;
    this.resume = () => resume.call(this);
  });

  return { Constructor, oscillator, gainNode, resume };
}

async function loadCueModule() {
  const mod = await import("./audio-cue");
  return mod;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("playStartCue", () => {
  it("is a no-op when Web Audio is unavailable", async () => {
    const { playStartCue } = await loadCueModule();
    expect(() => playStartCue()).not.toThrow();
  });

  it("synthesizes a short sine blip through a gain envelope", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playStartCue } = await loadCueModule();
    playStartCue();

    expect(fixture.Constructor).toHaveBeenCalledTimes(1);
    expect(fixture.oscillator.type).toBe("sine");
    expect(fixture.oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(800, 0);
    expect(fixture.oscillator.connect).toHaveBeenCalledWith(fixture.gainNode);
    expect(fixture.gainNode.connect).toHaveBeenCalledWith(expect.anything());
    expect(fixture.oscillator.start).toHaveBeenCalledTimes(1);
    expect(fixture.oscillator.stop.mock.calls[0][0]).toBeCloseTo(0.11, 5);
  });

  it("applies the default volume and decay envelope", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playStartCue } = await loadCueModule();
    playStartCue();

    const gain = fixture.gainNode.gain;
    expect(gain.exponentialRampToValueAtTime).toHaveBeenCalledTimes(2);
    expect(gain.exponentialRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(0.18, 5);
    expect(gain.exponentialRampToValueAtTime.mock.calls[0][1]).toBeCloseTo(0.004, 5);
    expect(gain.exponentialRampToValueAtTime.mock.calls[1][0]).toBeCloseTo(0.0001, 5);
  });

  it("honours explicit frequency, duration and volume options", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playStartCue } = await loadCueModule();
    playStartCue({ frequency: 600, durationMs: 200, volume: 0.4 });

    expect(fixture.oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(600, 0);
    expect(fixture.oscillator.stop.mock.calls[0][0]).toBeCloseTo(0.2, 5);
    expect(fixture.gainNode.gain.exponentialRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(0.4, 5);
  });

  it("resumes a suspended context (autoplay policy)", async () => {
    const fixture = makeFakeAudioContext("suspended");
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playStartCue } = await loadCueModule();
    playStartCue();

    expect(fixture.resume).toHaveBeenCalledTimes(1);
  });

  it("reuses a single shared AudioContext across calls", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playStartCue } = await loadCueModule();
    playStartCue();
    playStartCue();

    expect(fixture.Constructor).toHaveBeenCalledTimes(1);
    expect(fixture.oscillator.start).toHaveBeenCalledTimes(2);
  });

  it("disconnects the nodes when the oscillator ends", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playStartCue } = await loadCueModule();
    playStartCue();

    fixture.oscillator.end();
    expect(fixture.oscillator.disconnect).toHaveBeenCalledTimes(1);
    expect(fixture.gainNode.disconnect).toHaveBeenCalledTimes(1);
  });

  it("falls back to webkitAudioContext when AudioContext is missing", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("webkitAudioContext", fixture.Constructor);

    const { playStartCue } = await loadCueModule();
    playStartCue();

    expect(fixture.Constructor).toHaveBeenCalledTimes(1);
    expect(fixture.oscillator.start).toHaveBeenCalled();
  });
});
