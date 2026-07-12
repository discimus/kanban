import { Link } from "@shared/types";
import { uuid } from "@shared/utils";

export interface CreateLinkProps {
  backlogItemId: string;
  url: string;
}

export function createLink(props: CreateLinkProps): Link {
  if (!props.backlogItemId) throw new Error("O link precisa pertencer a um item de backlog.");
  const url = props.url?.trim();
  if (!url) throw new Error("A URL do link é obrigatória.");
  return {
    id: uuid(),
    backlogItemId: props.backlogItemId,
    url
  };
}

export function changeUrl(link: Link, url: string): Link {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("A URL do link é obrigatória.");
  return { ...link, url: trimmed };
}
