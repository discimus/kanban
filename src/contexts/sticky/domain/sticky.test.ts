import { describe, it, expect } from "vitest";
import {
  createSticky,
  setStickyTitle,
  setStickyDescription,
  createStickyFromBacklog,
  stickyLinkFromLink,
  stickyCommentFromComment,
  stickyImageFromImage,
  addStickyLink,
  markStickyLinkVisited,
  removeStickyLink,
  addStickyComment,
  removeStickyComment,
  addStickyImage,
  removeStickyImage
} from "@contexts/sticky/domain/sticky";
import type { BacklogItem, Link, Comment, Image } from "@shared/types";

describe("createSticky", () => {
  it("returns a Sticky with generated id and empty children", () => {
    const sticky = createSticky({ productId: "p1" });
    expect(sticky.id).toBeTypeOf("string");
    expect(sticky.id.length).toBeGreaterThan(0);
    expect(sticky.productId).toBe("p1");
    expect(sticky.createdAt).toBeTypeOf("string");
    expect(sticky.title).toBe("");
    expect(sticky.description).toBe("");
    expect(sticky.links).toEqual([]);
    expect(sticky.comments).toEqual([]);
    expect(sticky.images).toEqual([]);
  });

  it("throws Error when productId is empty", () => {
    expect(() => createSticky({ productId: "" })).toThrow(Error);
  });

  it("sets title and description when provided", () => {
    const sticky = createSticky({ productId: "p1", title: "  Pendências  ", description: " Revisar " });
    expect(sticky.title).toBe("Pendências");
    expect(sticky.description).toBe("Revisar");
  });
});

describe("setStickyTitle", () => {
  it("sets the title", () => {
    const sticky = createSticky({ productId: "p1" });
    const updated = setStickyTitle(sticky, "Pendências");
    expect(updated).not.toBe(sticky);
    expect(updated.title).toBe("Pendências");
  });

  it("trims the title", () => {
    const sticky = createSticky({ productId: "p1" });
    expect(setStickyTitle(sticky, "  Pendências  ").title).toBe("Pendências");
  });

  it("allows clearing the title", () => {
    const sticky = createSticky({ productId: "p1" });
    expect(setStickyTitle(sticky, "").title).toBe("");
  });
});

describe("setStickyDescription", () => {
  it("sets the description", () => {
    const sticky = createSticky({ productId: "p1" });
    const updated = setStickyDescription(sticky, "Lembrar de revisar");
    expect(updated).not.toBe(sticky);
    expect(updated.description).toBe("Lembrar de revisar");
  });

  it("trims the description", () => {
    const sticky = createSticky({ productId: "p1" });
    expect(setStickyDescription(sticky, "  Revisar  ").description).toBe("Revisar");
  });

  it("allows clearing the description", () => {
    const sticky = createSticky({ productId: "p1" });
    expect(setStickyDescription(sticky, "").description).toBe("");
  });
});

describe("createStickyFromBacklog", () => {
  const item = {
    id: "bi1",
    productId: "p1",
    title: "Tarefa A",
    description: "Descrição A",
    priority: "high",
    status: "doing",
    storyPoints: 3,
    classification: "task",
    createdAt: "2024-01-01T00:00:00.000Z",
    archivedAt: null,
    completedAt: null
  } as BacklogItem;

  const content = {
    links: [{ id: "l1", backlogItemId: "bi1", url: "https://x.com", visitedAt: "2024-01-02T00:00:00.000Z" }] as Link[],
    comments: [{ id: "c1", backlogItemId: "bi1", text: "Olá", createdAt: "2024-01-01T00:00:00.000Z" }] as Comment[],
    images: [{
      id: "i1",
      backlogItemId: "bi1",
      dataUrl: "data:image/png;base64,a=",
      filename: "a.png",
      mimeType: "image/png",
      fileSize: 2048,
      createdAt: "2024-01-01T00:00:00.000Z"
    }] as Image[]
  };

  it("builds a sticky preserving title, description and content", () => {
    const sticky = createStickyFromBacklog(item, content);
    expect(sticky.productId).toBe("p1");
    expect(sticky.title).toBe("Tarefa A");
    expect(sticky.description).toBe("Descrição A");
    expect(sticky.links).toHaveLength(1);
    expect(sticky.links[0].url).toBe("https://x.com");
    expect(sticky.links[0].visitedAt).toBe("2024-01-02T00:00:00.000Z");
    expect(sticky.comments).toHaveLength(1);
    expect(sticky.comments[0].text).toBe("Olá");
    expect(sticky.comments[0].createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(sticky.images).toHaveLength(1);
    expect(sticky.images[0].dataUrl).toBe("data:image/png;base64,a=");
    expect(sticky.images[0].fileSize).toBe(2048);
  });

  it("generates new ids for the copied content", () => {
    const sticky = createStickyFromBacklog(item, content);
    expect(sticky.links[0].id).not.toBe("l1");
    expect(sticky.comments[0].id).not.toBe("c1");
    expect(sticky.images[0].id).not.toBe("i1");
  });

  it("preserves updatedAt on comments when present", () => {
    const edited = { ...content.comments[0], updatedAt: "2024-01-03T00:00:00.000Z" };
    const sticky = createStickyFromBacklog(item, { ...content, comments: [edited] });
    expect(sticky.comments[0].updatedAt).toBe("2024-01-03T00:00:00.000Z");
  });
});

describe("stickyLinkFromLink", () => {
  it("maps a link preserving url and visitedAt", () => {
    const mapped = stickyLinkFromLink({ id: "l1", backlogItemId: "bi1", url: "https://x.com", visitedAt: "2024-01-02T00:00:00.000Z" });
    expect(mapped.url).toBe("https://x.com");
    expect(mapped.visitedAt).toBe("2024-01-02T00:00:00.000Z");
    expect(mapped.id).toBeTypeOf("string");
  });

  it("preserves visitCount", () => {
    const mapped = stickyLinkFromLink({ id: "l1", backlogItemId: "bi1", url: "https://x.com", visitedAt: "2024-01-02T00:00:00.000Z", visitCount: 4 });
    expect(mapped.visitCount).toBe(4);
  });
});

describe("stickyCommentFromComment", () => {
  it("maps a comment preserving text and timestamps", () => {
    const mapped = stickyCommentFromComment({
      id: "c1",
      backlogItemId: "bi1",
      text: "Olá",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    });
    expect(mapped.text).toBe("Olá");
    expect(mapped.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(mapped.updatedAt).toBe("2024-01-02T00:00:00.000Z");
  });
});

describe("stickyImageFromImage", () => {
  it("maps an image preserving file metadata", () => {
    const mapped = stickyImageFromImage({
      id: "i1",
      backlogItemId: "bi1",
      dataUrl: "data:image/png;base64,a=",
      filename: "a.png",
      mimeType: "image/png",
      fileSize: 2048,
      createdAt: "2024-01-01T00:00:00.000Z"
    });
    expect(mapped.filename).toBe("a.png");
    expect(mapped.mimeType).toBe("image/png");
    expect(mapped.fileSize).toBe(2048);
    expect(mapped.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });
});

describe("addStickyLink", () => {
  it("appends a link to the sticky", () => {
    const sticky = createSticky({ productId: "p1" });
    const updated = addStickyLink(sticky, { url: "https://example.com" });
    expect(updated).not.toBe(sticky);
    expect(updated.links).toHaveLength(1);
    expect(updated.links[0].url).toBe("https://example.com");
    expect(updated.links[0].visitedAt).toBeNull();
  });

  it("trims the URL", () => {
    const sticky = createSticky({ productId: "p1" });
    const updated = addStickyLink(sticky, { url: "  https://example.com  " });
    expect(updated.links[0].url).toBe("https://example.com");
  });

  it("throws Error when URL is empty", () => {
    const sticky = createSticky({ productId: "p1" });
    expect(() => addStickyLink(sticky, { url: "   " })).toThrow(Error);
  });

  it("starts the link with visitCount 0", () => {
    const sticky = createSticky({ productId: "p1" });
    const updated = addStickyLink(sticky, { url: "https://example.com" });
    expect(updated.links[0].visitCount).toBe(0);
  });
});

describe("markStickyLinkVisited", () => {
  it("sets visitedAt on the matching link", () => {
    const sticky = addStickyLink(createSticky({ productId: "p1" }), { url: "https://example.com" });
    const linkId = sticky.links[0].id;
    const updated = markStickyLinkVisited(sticky, linkId, "2026-07-12T14:30:00.000Z");
    expect(updated.links[0].visitedAt).toBe("2026-07-12T14:30:00.000Z");
  });

  it("increments visitCount on the matching link", () => {
    const sticky = addStickyLink(createSticky({ productId: "p1" }), { url: "https://example.com" });
    const linkId = sticky.links[0].id;
    const first = markStickyLinkVisited(sticky, linkId, "2026-07-12T14:30:00.000Z");
    const second = markStickyLinkVisited(first, linkId, "2026-07-12T15:00:00.000Z");
    expect(first.links[0].visitCount).toBe(1);
    expect(second.links[0].visitCount).toBe(2);
  });

  it("does not touch other links", () => {
    let sticky = createSticky({ productId: "p1" });
    sticky = addStickyLink(sticky, { url: "https://a.com" });
    sticky = addStickyLink(sticky, { url: "https://b.com" });
    const firstId = sticky.links[0].id;
    const updated = markStickyLinkVisited(sticky, sticky.links[1].id, "2026-07-12T14:30:00.000Z");
    expect(updated.links.find((l) => l.id === firstId)?.visitedAt).toBeNull();
  });
});

describe("removeStickyLink", () => {
  it("removes the matching link", () => {
    let sticky = createSticky({ productId: "p1" });
    sticky = addStickyLink(sticky, { url: "https://a.com" });
    sticky = addStickyLink(sticky, { url: "https://b.com" });
    const removedId = sticky.links[0].id;
    const updated = removeStickyLink(sticky, removedId);
    expect(updated.links).toHaveLength(1);
    expect(updated.links.some((l) => l.id === removedId)).toBe(false);
  });
});

describe("addStickyComment", () => {
  it("appends a comment to the sticky", () => {
    const sticky = createSticky({ productId: "p1" });
    const updated = addStickyComment(sticky, { text: "Olá" });
    expect(updated).not.toBe(sticky);
    expect(updated.comments).toHaveLength(1);
    expect(updated.comments[0].text).toBe("Olá");
    expect(updated.comments[0].createdAt).toBeTypeOf("string");
  });

  it("trims the text", () => {
    const sticky = createSticky({ productId: "p1" });
    const updated = addStickyComment(sticky, { text: "  Olá  " });
    expect(updated.comments[0].text).toBe("Olá");
  });

  it("throws Error when text is empty", () => {
    const sticky = createSticky({ productId: "p1" });
    expect(() => addStickyComment(sticky, { text: "" })).toThrow(Error);
  });
});

describe("removeStickyComment", () => {
  it("removes the matching comment", () => {
    let sticky = createSticky({ productId: "p1" });
    sticky = addStickyComment(sticky, { text: "um" });
    sticky = addStickyComment(sticky, { text: "dois" });
    const removedId = sticky.comments[0].id;
    const updated = removeStickyComment(sticky, removedId);
    expect(updated.comments).toHaveLength(1);
    expect(updated.comments.some((c) => c.id === removedId)).toBe(false);
  });
});

describe("addStickyImage", () => {
  const base = {
    dataUrl: "data:image/png;base64,iVBORw0KGgo=",
    filename: "foto.png",
    mimeType: "image/png",
    fileSize: 1024
  };

  it("appends an image to the sticky", () => {
    const sticky = createSticky({ productId: "p1" });
    const updated = addStickyImage(sticky, base);
    expect(updated).not.toBe(sticky);
    expect(updated.images).toHaveLength(1);
    expect(updated.images[0].filename).toBe("foto.png");
    expect(updated.images[0].createdAt).toBeTypeOf("string");
  });

  it("throws Error when dataUrl is empty", () => {
    const sticky = createSticky({ productId: "p1" });
    expect(() => addStickyImage(sticky, { ...base, dataUrl: "" })).toThrow(Error);
  });

  it("throws Error when filename is empty", () => {
    const sticky = createSticky({ productId: "p1" });
    expect(() => addStickyImage(sticky, { ...base, filename: "" })).toThrow(Error);
  });

  it("throws Error when mimeType is not an image", () => {
    const sticky = createSticky({ productId: "p1" });
    expect(() => addStickyImage(sticky, { ...base, mimeType: "application/pdf" })).toThrow(Error);
  });

  it("throws Error when fileSize exceeds 3 MB", () => {
    const sticky = createSticky({ productId: "p1" });
    expect(() => addStickyImage(sticky, { ...base, fileSize: 4 * 1024 * 1024 })).toThrow(Error);
  });
});

describe("removeStickyImage", () => {
  it("removes the matching image", () => {
    let sticky = createSticky({ productId: "p1" });
    sticky = addStickyImage(sticky, { dataUrl: "a", filename: "a.png", mimeType: "image/png", fileSize: 1 });
    sticky = addStickyImage(sticky, { dataUrl: "b", filename: "b.png", mimeType: "image/png", fileSize: 1 });
    const removedId = sticky.images[0].id;
    const updated = removeStickyImage(sticky, removedId);
    expect(updated.images).toHaveLength(1);
    expect(updated.images.some((img) => img.id === removedId)).toBe(false);
  });
});
