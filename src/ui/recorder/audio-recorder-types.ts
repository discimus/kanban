/**
 * Contract shared by every recording engine (MediaRecorder, Web Audio WAV).
 * Kept in its own module so the WAV recorder and the MediaRecorder facade can
 * both use them without a circular import.
 */

export interface RecordedAudio {
  dataUrl: string;
  mimeType: string;
  fileSize: number;
  duration: number;
}

export interface AudioRecorderController {
  elapsed(): number;
  stop(): Promise<RecordedAudio>;
  cancel(): void;
}

export class MicPermissionError extends Error {}
