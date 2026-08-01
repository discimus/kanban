import { Sticky, StickyComment, StickyImage, StickyLink } from "@shared/types";
import { uuid, nowISO } from "@shared/utils";

export interface CreateStickyProps {
  productId: string;
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

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const VALID_MIME_PREFIX = "image/";

export function createSticky(props: CreateStickyProps): Sticky {
  if (!props.productId) throw new Error("O card precisa pertencer a um produto.");
  return {
    id: uuid(),
    productId: props.productId,
    createdAt: nowISO(),
    links: [],
    comments: [],
    images: []
  };
}

export function addStickyLink(sticky: Sticky, props: AddStickyLinkProps): Sticky {
  const url = props.url?.trim();
  if (!url) throw new Error("A URL do link é obrigatória.");
  const link: StickyLink = { id: uuid(), url, visitedAt: null };
  return { ...sticky, links: [...sticky.links, link] };
}

export function markStickyLinkVisited(sticky: Sticky, linkId: string, now: string): Sticky {
  return {
    ...sticky,
    links: sticky.links.map((l) => (l.id === linkId ? { ...l, visitedAt: now } : l))
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
