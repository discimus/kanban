import { describe, it, expect } from "vitest";
import { createTask, changeStatus, assign, rename } from "@contexts/task/domain/task";

describe("createTask", () => {
  it("returns a Task with generated id", () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something" });
    expect(task.id).toBeTypeOf("string");
    expect(task.id.length).toBeGreaterThan(0);
  });

  it('returns status "todo"', () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something" });
    expect(task.status).toBe("todo");
  });

  it('assignedTo defaults to ""', () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something" });
    expect(task.assignedTo).toBe("");
  });

  it("trims title whitespace", () => {
    const task = createTask({ backlogItemId: "bi-1", title: "  Do something  " });
    expect(task.title).toBe("Do something");
  });

  it("throws Error when backlogItemId is empty", () => {
    expect(() => createTask({ backlogItemId: "", title: "Do something" })).toThrow(Error);
  });

  it("throws Error when title is empty", () => {
    expect(() => createTask({ backlogItemId: "bi-1", title: "" })).toThrow(Error);
  });

  it("throws Error when title is only whitespace", () => {
    expect(() => createTask({ backlogItemId: "bi-1", title: "   " })).toThrow(Error);
  });

  it("custom assignedTo is preserved", () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something", assignedTo: "Alice" });
    expect(task.assignedTo).toBe("Alice");
  });
});

describe("changeStatus", () => {
  it("returns new object with different reference (immutability)", () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something" });
    const updated = changeStatus(task, "doing");
    expect(updated).not.toBe(task);
  });

  it("changes status to the new value", () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something" });
    const updated = changeStatus(task, "doing");
    expect(updated.status).toBe("doing");
  });

  it("other properties remain unchanged", () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something" });
    const updated = changeStatus(task, "done");
    expect(updated.id).toBe(task.id);
    expect(updated.backlogItemId).toBe(task.backlogItemId);
    expect(updated.title).toBe(task.title);
    expect(updated.assignedTo).toBe(task.assignedTo);
  });
});

describe("assign", () => {
  it("returns new object with assignedTo set", () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something" });
    const updated = assign(task, "Bob");
    expect(updated).not.toBe(task);
    expect(updated.assignedTo).toBe("Bob");
  });

  it("trims whitespace from assignedTo", () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something" });
    const updated = assign(task, "  Bob  ");
    expect(updated.assignedTo).toBe("Bob");
  });
});

describe("rename", () => {
  it("returns new object with title changed", () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something" });
    const updated = rename(task, "New title");
    expect(updated).not.toBe(task);
    expect(updated.title).toBe("New title");
  });

  it("trims title whitespace", () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something" });
    const updated = rename(task, "  New title  ");
    expect(updated.title).toBe("New title");
  });

  it("throws Error when title is empty", () => {
    const task = createTask({ backlogItemId: "bi-1", title: "Do something" });
    expect(() => rename(task, "")).toThrow(Error);
  });
});
