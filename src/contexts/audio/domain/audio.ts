import { AudioRecording } from "@shared/types";
import { uuid, nowISO } from "@shared/utils";

export interface CreateAudioProps {
  backlogItemId: string;
  dataUrl: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  duration: number;
}

export const MAX_AUDIO_SIZE = 2 * 1024 * 1024;
export const MAX_AUDIO_DURATION = 60;
const VALID_MIME_PREFIX = "audio/";

export function createAudio(props: CreateAudioProps): AudioRecording {
  if (!props.backlogItemId) throw new Error("O áudio precisa pertencer a um item.");
  if (!props.dataUrl) throw new Error("Os dados do áudio são obrigatórios.");
  if (!props.filename?.trim()) throw new Error("O nome do arquivo é obrigatório.");
  if (!props.mimeType?.startsWith(VALID_MIME_PREFIX)) throw new Error("O arquivo precisa ser um áudio.");
  if (props.fileSize > MAX_AUDIO_SIZE) throw new Error("O áudio excede o limite de 2 MB.");
  if (!Number.isFinite(props.duration) || props.duration <= 0 || props.duration > MAX_AUDIO_DURATION) {
    throw new Error(`A duração do áudio é inválida (máx. ${MAX_AUDIO_DURATION}s).`);
  }

  return {
    id: uuid(),
    backlogItemId: props.backlogItemId,
    dataUrl: props.dataUrl,
    filename: props.filename.trim(),
    mimeType: props.mimeType,
    fileSize: props.fileSize,
    duration: Number(props.duration.toFixed(1)),
    createdAt: nowISO()
  };
}
