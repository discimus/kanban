import { el, icon, flashItem } from "@ui/components/dom";
import { openModal, closeModal } from "../modal";
import { audioService } from "@contexts/audio/application/audio.service";
import { showAlert } from "@ui/components/dialog";
import { t } from "@shared/i18n";
import { startRecording, extensionForMimeType, MicPermissionError, AudioRecorderController, RecordedAudio } from "@ui/recorder/audio-recorder";
import { MAX_AUDIO_DURATION } from "@contexts/audio/domain/audio";

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function openAudioRecorderForm(backlogItemId: string): void {
  const dot = el("span", { class: "recorder__dot" }, []);
  const timeEl = el("span", { class: "recorder__time" }, ["00:00"]);
  const statusEl = el("span", { class: "recorder__status" }, [t("audio.pronto")]);

  const startBtn = el("button", { class: "btn btn--primary recorder__record-btn", type: "button" }, [icon("mic"), t("audio.gravar")]);
  const saveBtn = el("button", { class: "btn btn--primary", type: "button", disabled: true }, [icon("check"), t("audio.salvar")]);
  const discardBtn = el("button", { class: "btn btn--ghost", type: "button" }, [icon("close"), t("audio.descartar")]);
  const preview = el("audio", { class: "recorder__preview", controls: true, preload: "metadata", hidden: true }) as HTMLAudioElement;

  let controller: AudioRecorderController | null = null;
  let result: RecordedAudio | null = null;
  let timer: number | null = null;

  const setRecordingState = (recording: boolean): void => {
    dot.classList.toggle("recorder__dot--recording", recording);
    statusEl.textContent = recording ? t("audio.gravando") : t("audio.pronto");
    startBtn.replaceChildren(icon(recording ? "stop" : "mic"), recording ? t("audio.parar") : t("audio.gravar"));
  };

  const clearTimer = (): void => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  const stopRecording = (): void => {
    if (!controller) return;
    const ctrl = controller;
    controller = null;
    clearTimer();
    setRecordingState(false);
    ctrl.stop()
      .then((r) => {
        result = r;
        timeEl.textContent = formatTime(r.duration);
        preview.src = r.dataUrl;
        preview.hidden = false;
        saveBtn.disabled = false;
        statusEl.textContent = t("audio.prontoParaSalvar");
      })
      .catch(() => { /* canceled or error */ });
  };

  const cancelRecording = (): void => {
    if (!controller) return;
    const ctrl = controller;
    controller = null;
    clearTimer();
    ctrl.cancel();
    void ctrl.stop().catch(() => {});
    setRecordingState(false);
    timeEl.textContent = "00:00";
    result = null;
    preview.hidden = true;
    preview.src = "";
    saveBtn.disabled = true;
  };

  startBtn.addEventListener("click", () => {
    if (controller) {
      stopRecording();
      return;
    }
    result = null;
    saveBtn.disabled = true;
    preview.hidden = true;
    timeEl.textContent = "00:00";
    startRecording()
      .then((ctrl) => {
        controller = ctrl;
        setRecordingState(true);
        timer = window.setInterval(() => {
          const sec = ctrl.elapsed();
          timeEl.textContent = formatTime(sec);
          if (sec >= MAX_AUDIO_DURATION) stopRecording();
        }, 250);
      })
      .catch((e) => {
        if (e instanceof MicPermissionError) showAlert(t("audio.permissaoNegada"));
        else showAlert(t("audio.erroGravar"));
      });
  });

  saveBtn.addEventListener("click", () => {
    if (!result) return;
    try {
      const created = audioService.create({
        backlogItemId,
        dataUrl: result.dataUrl,
        filename: `audio-${Date.now()}.${extensionForMimeType(result.mimeType)}`,
        mimeType: result.mimeType,
        fileSize: result.fileSize,
        duration: result.duration
      });
      closeModal();
      flashItem(created.id);
    } catch (e) {
      showAlert((e as Error).message);
    }
  });

  discardBtn.addEventListener("click", () => {
    cancelRecording();
    closeModal();
  });

  const body = el("div", { class: "recorder" }, [
    el("div", { class: "recorder__display" }, [dot, timeEl, statusEl]),
    preview,
    el("div", { class: "recorder__actions" }, [startBtn, saveBtn, discardBtn]),
    el("p", { class: "recorder__hint" }, [t("audio.limiteAudio", { n: MAX_AUDIO_DURATION })])
  ]);

  openModal({ title: t("audio.titulo"), body, autoFocus: false });
}
