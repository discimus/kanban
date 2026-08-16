import { describe, it, expect, vi, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// audio-cue.ts keeps a module-scoped shared AudioContext, so every test loads
// a fresh module instance (vi.resetModules + dynamic import) to control both
// the singleton state and the stubbed Web Audio globals.
// ---------------------------------------------------------------------------

interface FakeAudioContextFixture {
  Constructor: ReturnType<typeof vi.fn>;
  oscillators: Array<{
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    addEventListener: (event: string, cb: () => void) => void;
    end: () => void;
  }>;
  gainNodes: Array<{
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    gain: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> };
  }>;
  resume: ReturnType<typeof vi.fn>;
}

function makeFakeAudioContext(initialState = "running"): FakeAudioContextFixture {
  const oscillators: FakeAudioContextFixture["oscillators"] = [];
  const gainNodes: FakeAudioContextFixture["gainNodes"] = [];
  const resume = vi.fn(function (this: { state: string }) {
    this.state = "running";
    return Promise.resolve();
  });

  const Constructor = vi.fn(function (this: {
    state: string;
    currentTime: number;
    destination: object;
    createOscillator: () => FakeAudioContextFixture["oscillators"][number];
    createGain: () => FakeAudioContextFixture["gainNodes"][number];
    resume: () => Promise<void>;
  }) {
    this.state = initialState;
    this.currentTime = 0;
    this.destination = {};
    this.createOscillator = () => {
      const oscDisconnect = vi.fn();
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
      oscillators.push(oscillator);
      return oscillator;
    };
    this.createGain = () => {
      const gainNode = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn()
        }
      };
      gainNodes.push(gainNode);
      return gainNode;
    };
    this.resume = () => resume.call(this);
  });

  return { Constructor, oscillators, gainNodes, resume };
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
    expect(fixture.oscillators[0].type).toBe("sine");
    expect(fixture.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(800, 0);
    expect(fixture.oscillators[0].connect).toHaveBeenCalledWith(fixture.gainNodes[0]);
    expect(fixture.gainNodes[0].connect).toHaveBeenCalledWith(expect.anything());
    expect(fixture.oscillators[0].start).toHaveBeenCalledTimes(1);
    expect(fixture.oscillators[0].stop.mock.calls[0][0]).toBeCloseTo(0.11, 5);
  });

  it("applies the default volume and decay envelope", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playStartCue } = await loadCueModule();
    playStartCue();

    const gain = fixture.gainNodes[0].gain;
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

    expect(fixture.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(600, 0);
    expect(fixture.oscillators[0].stop.mock.calls[0][0]).toBeCloseTo(0.2, 5);
    expect(fixture.gainNodes[0].gain.exponentialRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(0.4, 5);
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
    expect(fixture.oscillators.length).toBe(2);
  });

  it("disconnects the nodes when the oscillator ends", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playStartCue } = await loadCueModule();
    playStartCue();

    fixture.oscillators[0].end();
    expect(fixture.oscillators[0].disconnect).toHaveBeenCalledTimes(1);
    expect(fixture.gainNodes[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it("falls back to webkitAudioContext when AudioContext is missing", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("webkitAudioContext", fixture.Constructor);

    const { playStartCue } = await loadCueModule();
    playStartCue();

    expect(fixture.Constructor).toHaveBeenCalledTimes(1);
    expect(fixture.oscillators[0].start).toHaveBeenCalled();
  });
});

describe("playRecordingStartCue", () => {
  it("is a no-op when Web Audio is unavailable", async () => {
    const { playRecordingStartCue } = await loadCueModule();
    expect(() => playRecordingStartCue()).not.toThrow();
  });

  it("plays two ascending blips spaced by the default gap", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playRecordingStartCue } = await loadCueModule();
    playRecordingStartCue();

    expect(fixture.oscillators.length).toBe(2);
    expect(fixture.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(988, 0);
    expect(fixture.oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(1319, 0.08);
    expect(fixture.oscillators[0].start.mock.calls[0][0]).toBeCloseTo(0, 5);
    expect(fixture.oscillators[1].start.mock.calls[0][0]).toBeCloseTo(0.08, 5);
  });

  it("stops each blip after the default duration and applies the low volume", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playRecordingStartCue } = await loadCueModule();
    playRecordingStartCue();

    expect(fixture.oscillators[0].stop.mock.calls[0][0]).toBeCloseTo(0.075, 5);
    expect(fixture.oscillators[1].stop.mock.calls[0][0]).toBeCloseTo(0.155, 5);
    expect(fixture.gainNodes[0].gain.exponentialRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(0.16, 5);
  });

  it("honours explicit frequency, gap, duration and volume options", async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playRecordingStartCue } = await loadCueModule();
    playRecordingStartCue({ frequency: 700, frequencySecond: 900, durationMs: 60, gapMs: 100, volume: 0.3 });

    expect(fixture.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(700, 0);
    expect(fixture.oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(900, 0.1);
    expect(fixture.oscillators[0].stop.mock.calls[0][0]).toBeCloseTo(0.06, 5);
    expect(fixture.oscillators[1].start.mock.calls[0][0]).toBeCloseTo(0.1, 5);
    expect(fixture.gainNodes[0].gain.exponentialRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(0.3, 5);
  });

  it("resumes a suspended context and reuses the shared context across calls", async () => {
    const fixture = makeFakeAudioContext("suspended");
    vi.stubGlobal("AudioContext", fixture.Constructor);

    const { playRecordingStartCue } = await loadCueModule();
    playRecordingStartCue();
    playRecordingStartCue();

    expect(fixture.resume).toHaveBeenCalledTimes(1);
    expect(fixture.Constructor).toHaveBeenCalledTimes(1);
    expect(fixture.oscillators.length).toBe(4);
  });
});
