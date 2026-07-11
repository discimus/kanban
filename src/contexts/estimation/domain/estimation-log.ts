import { EstimationLog } from "@shared/types";
import { uuid, nowISO } from "@shared/utils";

export interface CreateEstimationProps {
  taskId: string;
  estimate: number;
  comment?: string;
}

export function createEstimation(props: CreateEstimationProps): EstimationLog {
  if (!props.taskId) throw new Error("A estimativa precisa referenciar uma tarefa.");
  if (!Number.isFinite(props.estimate) || props.estimate < 0) {
    throw new Error("A estimativa deve ser um número maior ou igual a zero.");
  }
  return {
    id: uuid(),
    taskId: props.taskId,
    estimate: props.estimate,
    createdAt: nowISO(),
    comment: props.comment?.trim() ?? ""
  };
}
