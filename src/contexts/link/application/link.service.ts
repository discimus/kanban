import { Link } from "@shared/types";
import { eventBus } from "@shared/events";
import { nowISO } from "@shared/utils";
import { createLink, changeUrl as changeUrlFn, markAsVisited as markAsVisitedFn, CreateLinkProps } from "../domain/link";
import { linkRepository } from "../infrastructure/link.repository";

export const linkService = {
  list(): Link[] {
    return linkRepository.all();
  },

  byBacklogItem(backlogItemId: string): Link[] {
    return linkRepository.byBacklogItem(backlogItemId);
  },

  get(id: string): Link | undefined {
    return linkRepository.findById(id);
  },

  create(props: CreateLinkProps): Link {
    const link = createLink(props);
    linkRepository.add(link);
    eventBus.emit("link:created", link);
    return link;
  },

  changeUrl(id: string, url: string): Link {
    const existing = linkRepository.findById(id);
    if (!existing) throw new Error("Link não encontrado.");
    const updated = changeUrlFn(existing, url);
    linkRepository.save(updated);
    eventBus.emit("link:updated", updated);
    return updated;
  },

  markAsVisited(id: string): Link {
    const existing = linkRepository.findById(id);
    if (!existing) throw new Error("Link não encontrado.");
    const updated = markAsVisitedFn(existing, nowISO());
    linkRepository.save(updated);
    eventBus.emit("link:visited", updated);
    return updated;
  },

  delete(id: string): void {
    linkRepository.remove(id);
    eventBus.emit("link:deleted", id);
  }
};
