export type DomainEvent =
  | "state:changed"
  | "product:created"
  | "product:updated"
  | "product:pending-completion"
  | "product:deleted"
  | "backlog:created"
  | "backlog:updated"
  | "backlog:moved"
  | "backlog:deleted"
  | "backlog:archived"
  | "backlog:restored"
  | "task:created"
  | "task:updated"
  | "link:created"
  | "link:updated"
  | "link:deleted"
  | "link:visited"
  | "estimation:logged"
  | "comment:created"
  | "comment:deleted";

type Handler = (payload?: unknown) => void;

class EventBus {
  private handlers = new Map<DomainEvent, Set<Handler>>();

  on(event: DomainEvent, handler: Handler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: DomainEvent, handler: Handler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: DomainEvent, payload?: unknown): void {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }
}

export const eventBus = new EventBus();
