import { EstimationLog } from "@shared/types";
import { eventBus } from "@shared/events";
import { createEstimation, CreateEstimationProps } from "../domain/estimation-log";
import { estimationRepository } from "../infrastructure/estimation.repository";

export const estimationService = {
  history(taskId: string): EstimationLog[] {
    return estimationRepository.byTask(taskId);
  },

  log(props: CreateEstimationProps): EstimationLog {
    const entry = createEstimation(props);
    estimationRepository.add(entry);
    eventBus.emit("estimation:logged", entry);
    return entry;
  },

  delete(id: string): void {
    estimationRepository.remove(id);
  }
};
