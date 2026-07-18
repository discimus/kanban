import { Image } from "@shared/types";
import { uuid, nowISO } from "@shared/utils";

export interface CreateImageProps {
  backlogItemId: string;
  dataUrl: string;
  filename: string;
  mimeType: string;
  fileSize: number;
}

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const VALID_MIME_PREFIX = "image/";

export function createImage(props: CreateImageProps): Image {
  if (!props.backlogItemId) throw new Error("A imagem precisa pertencer a um item.");
  if (!props.dataUrl) throw new Error("Os dados da imagem são obrigatórios.");
  if (!props.filename?.trim()) throw new Error("O nome do arquivo é obrigatório.");
  if (!props.mimeType?.startsWith(VALID_MIME_PREFIX)) throw new Error("O arquivo precisa ser uma imagem.");
  if (props.fileSize > MAX_IMAGE_SIZE) throw new Error("A imagem excede o limite de 3 MB.");

  return {
    id: uuid(),
    backlogItemId: props.backlogItemId,
    dataUrl: props.dataUrl,
    filename: props.filename.trim(),
    mimeType: props.mimeType,
    fileSize: props.fileSize,
    createdAt: nowISO()
  };
}
