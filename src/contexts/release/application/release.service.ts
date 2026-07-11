import { Release } from "@shared/types";
import { eventBus } from "@shared/events";
import { createRelease, finalizeRelease, CreateReleaseProps } from "../domain/release";
import { releaseRepository } from "../infrastructure/release.repository";
import { backlogService } from "@contexts/product/application/backlog.service";

export const releaseService = {
  list(): Release[] {
    return releaseRepository.all();
  },

  byProduct(productId: string): Release[] {
    return releaseRepository.byProduct(productId);
  },

  get(id: string): Release | undefined {
    return releaseRepository.findById(id);
  },

  create(props: CreateReleaseProps): Release {
    const release = createRelease(props);
    releaseRepository.add(release);
    eventBus.emit("release:created", release);
    return release;
  },

  scheduleItem(releaseId: string, backlogItemId: string): void {
    const release = releaseRepository.findById(releaseId);
    if (!release) throw new Error("Release não encontrada.");
    backlogService.assignRelease(backlogItemId, releaseId);
  },

  unscheduleItem(backlogItemId: string): void {
    backlogService.assignRelease(backlogItemId, null);
  },

  finalize(id: string): Release {
    const existing = releaseRepository.findById(id);
    if (!existing) throw new Error("Release não encontrada.");
    const updated = finalizeRelease(existing);
    releaseRepository.save(updated);
    eventBus.emit("release:finalized", updated);
    return updated;
  },

  delete(id: string): void {
    releaseRepository.remove(id);
  }
};
