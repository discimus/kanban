import { Sticky, StickyComment, StickyImage, StickyAudio, StickyLink, BacklogItem, Link, Comment, Image, AudioRecording } from "@shared/types";
import { uuid, nowISO } from "@shared/utils";

export interface CreateStickyProps {
  productId: string;
  title?: string;
  description?: string;
}

export interface AddStickyLinkProps {
  url: string;
}

export interface AddStickyCommentProps {
  text: string;
}

export interface AddStickyImageProps {
  dataUrl: string;
  filename: string;
  mimeType: string;
  fileSize: number;
}

export interface AddStickyAudioProps {
  dataUrl: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  duration: number;
}

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const VALID_MIME_PREFIX = "image/";
const MAX_AUDIO_SIZE = 2 * 1024 * 1024;
const MAX_AUDIO_DURATION = 60;
const VALID_AUDIO_MIME_PREFIX = "audio/";

export function createSticky(props: CreateStickyProps): Sticky {
  if (!props.productId) throw new Error("O card precisa pertencer a um produto.");
  return {
    id: uuid(),
    productId: props.productId,
    createdAt: nowISO(),
    title: (props.title ?? "").trim(),
    description: (props.description ?? "").trim(),
    links: [],
    comments: [],
    images: [],
    audios: []
  };
}

export function setStickyTitle(sticky: Sticky, title: string): Sticky {
  return { ...sticky, title: title.trim() };
}

export function setStickyDescription(sticky: Sticky, description: string): Sticky {
  return { ...sticky, description: description.trim() };
}

export function addStickyLink(sticky: Sticky, props: AddStickyLinkProps): Sticky {
  const url = props.url?.trim();
  if (!url) throw new Error("A URL do link é obrigatória.");
  const link: StickyLink = { id: uuid(), url, visitedAt: null, visitCount: 0 };
  return { ...sticky, links: [...sticky.links, link] };
}

export function markStickyLinkVisited(sticky: Sticky, linkId: string, now: string): Sticky {
  return {
    ...sticky,
    links: sticky.links.map((l) => (l.id === linkId ? { ...l, visitedAt: now, visitCount: (l.visitCount ?? 0) + 1 } : l))
  };
}

export function removeStickyLink(sticky: Sticky, linkId: string): Sticky {
  return { ...sticky, links: sticky.links.filter((l) => l.id !== linkId) };
}

export function addStickyComment(sticky: Sticky, props: AddStickyCommentProps): Sticky {
  const text = props.text?.trim();
  if (!text) throw new Error("O texto do comentário é obrigatório.");
  const comment: StickyComment = { id: uuid(), text, createdAt: nowISO() };
  return { ...sticky, comments: [...sticky.comments, comment] };
}

export function removeStickyComment(sticky: Sticky, commentId: string): Sticky {
  return { ...sticky, comments: sticky.comments.filter((c) => c.id !== commentId) };
}

export function addStickyImage(sticky: Sticky, props: AddStickyImageProps): Sticky {
  if (!props.dataUrl) throw new Error("Os dados da imagem são obrigatórios.");
  if (!props.filename?.trim()) throw new Error("O nome do arquivo é obrigatório.");
  if (!props.mimeType?.startsWith(VALID_MIME_PREFIX)) throw new Error("O arquivo precisa ser uma imagem.");
  if (props.fileSize > MAX_IMAGE_SIZE) throw new Error("A imagem excede o limite de 3 MB.");
  const image: StickyImage = {
    id: uuid(),
    dataUrl: props.dataUrl,
    filename: props.filename.trim(),
    mimeType: props.mimeType,
    fileSize: props.fileSize,
    createdAt: nowISO()
  };
  return { ...sticky, images: [...sticky.images, image] };
}

export function removeStickyImage(sticky: Sticky, imageId: string): Sticky {
  return { ...sticky, images: sticky.images.filter((img) => img.id !== imageId) };
}

export function addStickyAudio(sticky: Sticky, props: AddStickyAudioProps): Sticky {
  if (!props.dataUrl) throw new Error("Os dados do áudio são obrigatórios.");
  if (!props.filename?.trim()) throw new Error("O nome do arquivo é obrigatório.");
  if (!props.mimeType?.startsWith(VALID_AUDIO_MIME_PREFIX)) throw new Error("O arquivo precisa ser um áudio.");
  if (props.fileSize > MAX_AUDIO_SIZE) throw new Error("O áudio excede o limite de 2 MB.");
  if (!Number.isFinite(props.duration) || props.duration <= 0 || props.duration > MAX_AUDIO_DURATION) {
    throw new Error(`A duração do áudio é inválida (máx. ${MAX_AUDIO_DURATION}s).`);
  }
  const audio: StickyAudio = {
    id: uuid(),
    dataUrl: props.dataUrl,
    filename: props.filename.trim(),
    mimeType: props.mimeType,
    fileSize: props.fileSize,
    duration: Number(props.duration.toFixed(1)),
    createdAt: nowISO()
  };
  return { ...sticky, audios: [...(sticky.audios ?? []), audio] };
}

export function removeStickyAudio(sticky: Sticky, audioId: string): Sticky {
  return { ...sticky, audios: (sticky.audios ?? []).filter((a) => a.id !== audioId) };
}

export function stickyLinkFromLink(link: Link): StickyLink {
  return { id: uuid(), url: link.url, visitedAt: link.visitedAt, visitCount: link.visitCount };
}

export function stickyCommentFromComment(comment: Comment): StickyComment {
  return { id: uuid(), text: comment.text, createdAt: comment.createdAt, updatedAt: comment.updatedAt };
}

export function stickyImageFromImage(image: Image): StickyImage {
  return {
    id: uuid(),
    dataUrl: image.dataUrl,
    filename: image.filename,
    mimeType: image.mimeType,
    fileSize: image.fileSize,
    createdAt: image.createdAt
  };
}

export function stickyAudioFromAudio(audio: AudioRecording): StickyAudio {
  return {
    id: uuid(),
    dataUrl: audio.dataUrl,
    filename: audio.filename,
    mimeType: audio.mimeType,
    fileSize: audio.fileSize,
    duration: audio.duration,
    createdAt: audio.createdAt
  };
}

export function createStickyFromBacklog(
  item: BacklogItem,
  content: { links: Link[]; comments: Comment[]; images: Image[]; audios?: AudioRecording[] }
): Sticky {
  return {
    id: uuid(),
    productId: item.productId,
    createdAt: nowISO(),
    title: item.title,
    description: item.description,
    links: content.links.map(stickyLinkFromLink),
    comments: content.comments.map(stickyCommentFromComment),
    images: content.images.map(stickyImageFromImage),
    audios: (content.audios ?? []).map(stickyAudioFromAudio)
  };
}
