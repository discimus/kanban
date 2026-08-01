import { AudioRecording } from "@shared/types";
import { eventBus } from "@shared/events";
import { createAudio, CreateAudioProps } from "../domain/audio";
import { audioRepository } from "../infrastructure/audio.repository";

export const audioService = {
  byBacklogItem(backlogItemId: string): AudioRecording[] {
    return audioRepository.byBacklogItem(backlogItemId);
  },

  create(props: CreateAudioProps): AudioRecording {
    const audio = createAudio(props);
    audioRepository.add(audio);
    eventBus.emit("audio:created", audio);
    return audio;
  },

  delete(id: string): void {
    audioRepository.remove(id);
    eventBus.emit("audio:deleted", id);
  }
};
