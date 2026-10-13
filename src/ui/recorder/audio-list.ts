import { el, icon } from "@ui/components/dom";
import { t } from "@shared/i18n";
import { createAudioPlayer, type AudioPlayerControls } from "./audio-player";
import { createAudioCascade, type AudioCascade, type CascadeEntry } from "./audio-cascade";
import { formatPlaybackRate, nextPlaybackRate } from "./audio-speed";

/**
 * Structural subset shared by `AudioRecording` (backlog item) and `StickyAudio`
 * (sticky note), so the same renderer serves both.
 */
export interface CardAudio {
  id: string;
  dataUrl: string;
  filename: string;
  mimeType: string;
  duration: number;
}

export interface AudioListOptions {
  audios: CardAudio[];
  readOnly: boolean;
  /** Current playback speed, owned by the caller so it survives re-renders. */
  initialRate: number;
  /** Called when the user cycles the speed so the caller can persist it. */
  onRateChange: (rate: number) => void;
  onDelete: (audio: CardAudio) => void;
  onDownload: (audio: CardAudio) => void;
  onError: () => void;
}

/**
 * Renders the audio rows of a card (backlog item or sticky) plus the shared
 * per-card speed pill, and wires them into a cascade queue.
 *
 * The speed pill cycles 1 -> 1.5 -> 2 on tap and applies the new rate to every
 * track on the card *in place* (no rebuild), so changing speed never interrupts
 * playback or resets the playhead. `onRateChange` lets the caller persist the
 * choice for the next rebuild.
 */
export function renderAudioList(list: HTMLElement, options: AudioListOptions): AudioCascade {
  const { audios, readOnly, onDelete, onDownload, onError } = options;
  let rate = options.initialRate;

  const entries: CascadeEntry[] = [];
  const controls: AudioPlayerControls[] = [];

  if (audios.length > 0) {
    const speedBtn = el("button", {
      class: "card__audio-speed",
      type: "button",
      "aria-label": t("audio.velocidadeAtual", { rate: formatPlaybackRate(rate) }),
      title: t("audio.velocidade")
    }, [formatPlaybackRate(rate)]);

    speedBtn.addEventListener("click", () => {
      rate = nextPlaybackRate(rate);
      const label = formatPlaybackRate(rate);
      for (const control of controls) control.setPlaybackRate(rate);
      speedBtn.textContent = label;
      speedBtn.setAttribute("aria-label", t("audio.velocidadeAtual", { rate: label }));
      options.onRateChange(rate);
    });

    list.append(speedBtn);
  }

  for (const a of audios) {
    const control = createAudioPlayer(a.dataUrl, onError, a.duration, a.mimeType);
    control.setPlaybackRate(rate);
    controls.push(control);
    const { player, playBtn, progressBar, durationEl } = control;

    const downloadBtn = el("button", { class: "card__audio-action", "aria-label": t("card.downloadAudio"), type: "button" }, [icon("download")]);
    downloadBtn.addEventListener("click", () => onDownload(a));

    const delBtn = el("button", { class: "card__audio-action card__audio-action--delete", "aria-label": t("card.excluirAudio"), type: "button" }, [icon("delete")]);
    delBtn.disabled = readOnly;
    if (!readOnly) {
      delBtn.addEventListener("click", () => onDelete(a));
    }

    const row = el("div", { class: "card__audio", "data-id": a.id }, [
      playBtn,
      el("span", { class: "card__audio-name" }, [a.filename]),
      durationEl,
      player,
      downloadBtn,
      delBtn,
      progressBar
    ]);
    list.append(row);
    entries.push({ player, playBtn, row });
  }

  return createAudioCascade(entries, { onError });
}
