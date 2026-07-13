import { describe, it, expect } from "vitest";
import { createComment } from "@contexts/comment/domain/comment";

describe("createComment", () => {
  it("returns a Comment with generated id", () => {
    const comment = createComment({ backlogItemId: "b-1", text: "Comentário de teste" });
    expect(comment.id).toBeTypeOf("string");
    expect(comment.id.length).toBeGreaterThan(0);
  });

  it("returns createdAt as ISO string", () => {
    const comment = createComment({ backlogItemId: "b-1", text: "Comentário de teste" });
    expect(comment.createdAt).toBeTypeOf("string");
    expect(() => new Date(comment.createdAt)).not.toThrow();
  });

  it("stores text correctly", () => {
    const comment = createComment({ backlogItemId: "b-1", text: "Meu comentário" });
    expect(comment.text).toBe("Meu comentário");
  });

  it("trims whitespace from text", () => {
    const comment = createComment({ backlogItemId: "b-1", text: "  Comentário com espaços  " });
    expect(comment.text).toBe("Comentário com espaços");
  });

  it("stores backlogItemId correctly", () => {
    const comment = createComment({ backlogItemId: "b-42", text: "Comentário" });
    expect(comment.backlogItemId).toBe("b-42");
  });

  it("throws Error when backlogItemId is empty", () => {
    expect(() => createComment({ backlogItemId: "", text: "Comentário" })).toThrow(Error);
  });

  it("throws Error when text is empty", () => {
    expect(() => createComment({ backlogItemId: "b-1", text: "" })).toThrow(Error);
  });

  it("throws Error when text is only whitespace", () => {
    expect(() => createComment({ backlogItemId: "b-1", text: "   " })).toThrow(Error);
  });
});
