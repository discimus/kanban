import { AudioRecording } from "@shared/types";
import { store } from "@shared/storage";
import { putBlob, deleteBlob, dataUrlToBlob } from "@shared/storage/blob-store";

export const audioRepository = {
  all(): AudioRecording[] {
    return store.getState().audios;
  },

  byBacklogItem(backlogItemId: string): AudioRecording[] {
    return store.getState().audios.filter((a) => a.backlogItemId === backlogItemId);
  },

  findById(id: string): AudioRecording | undefined {
    return store.getState().audios.find((a) => a.id === id);
  },

  add(audio: AudioRecording): void {
    store.update((s) => {
      s.audios.push(audio);
    });
    void putBlob(audio.id, dataUrlToBlob(audio.dataUrl));
  },

  remove(id: string): void {
    store.update((s) => {
      s.audios = s.audios.filter((a) => a.id !== id);
    });
    void deleteBlob(id);
  }
};
