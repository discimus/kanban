import { describe, it, expect, vi, afterEach } from "vitest";
import { eventBus } from "@shared/events";

describe("EventBus", () => {
  const unsubs: Array<() => void> = [];

  afterEach(() => {
    unsubs.forEach((fn) => fn());
    unsubs.length = 0;
  });

  it("on() + emit() calls the handler with payload", () => {
    const handler = vi.fn();
    unsubs.push(eventBus.on("backlog:created", handler));
    eventBus.emit("backlog:created", { id: "1" });
    expect(handler).toHaveBeenCalledWith({ id: "1" });
  });

  it("emit() with no payload calls handler with undefined", () => {
    const handler = vi.fn();
    unsubs.push(eventBus.on("product:updated", handler));
    eventBus.emit("product:updated");
    expect(handler).toHaveBeenCalledWith(undefined);
  });

  it("off() removes handler so emit() does nothing", () => {
    const handler = vi.fn();
    const unsubscribe = eventBus.on("task:created", handler);
    unsubscribe();
    eventBus.emit("task:created", { id: "1" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("multiple handlers for same event all get called", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    unsubs.push(eventBus.on("link:created", handler1));
    unsubs.push(eventBus.on("link:created", handler2));
    eventBus.emit("link:created", { id: "1" });
    expect(handler1).toHaveBeenCalledWith({ id: "1" });
    expect(handler2).toHaveBeenCalledWith({ id: "1" });
  });

  it("unrelated event does not trigger other handlers", () => {
    const handler = vi.fn();
    unsubs.push(eventBus.on("estimation:logged", handler));
    eventBus.emit("backlog:deleted", { id: "2" });
    expect(handler).not.toHaveBeenCalled();
  });
});
