import { Comment } from "@shared/types";
import { uuid, nowISO } from "@shared/utils";

export interface CreateCommentProps {
  backlogItemId: string;
  text: string;
}

export function createComment(props: CreateCommentProps): Comment {
  if (!props.backlogItemId) throw new Error("O comentário precisa pertencer a um item de backlog.");
  const text = props.text?.trim();
  if (!text) throw new Error("O texto do comentário é obrigatório.");
  return {
    id: uuid(),
    backlogItemId: props.backlogItemId,
    text,
    createdAt: nowISO()
  };
}
