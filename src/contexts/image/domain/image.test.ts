import { describe, it, expect } from "vitest";
import { createImage } from "@contexts/image/domain/image";

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    backlogItemId: "b1",
    dataUrl: "data:image/png;base64,iVBORw0KGgo=",
    filename: "foto.png",
    mimeType: "image/png",
    fileSize: 1024,
    ...overrides
  };
}

describe("createImage", () => {
  it("returns an Image with generated id", () => {
    const img = createImage(makeProps());
    expect(img.id).toBeTypeOf("string");
    expect(img.id.length).toBeGreaterThan(0);
  });

  it("returns createdAt as ISO string", () => {
    const img = createImage(makeProps());
    expect(img.createdAt).toBeTypeOf("string");
    expect(() => new Date(img.createdAt)).not.toThrow();
  });

  it("stores dataUrl correctly", () => {
    const img = createImage(makeProps({ dataUrl: "data:image/jpeg;base64,/9j/" }));
    expect(img.dataUrl).toBe("data:image/jpeg;base64,/9j/");
  });

  it("stores filename correctly", () => {
    const img = createImage(makeProps({ filename: "screenshot.png" }));
    expect(img.filename).toBe("screenshot.png");
  });

  it("stores mimeType correctly", () => {
    const img = createImage(makeProps({ mimeType: "image/jpeg" }));
    expect(img.mimeType).toBe("image/jpeg");
  });

  it("stores fileSize correctly", () => {
    const img = createImage(makeProps({ fileSize: 2048 }));
    expect(img.fileSize).toBe(2048);
  });

  it("stores backlogItemId correctly", () => {
    const img = createImage(makeProps({ backlogItemId: "b-42" }));
    expect(img.backlogItemId).toBe("b-42");
  });

  it("throws Error when backlogItemId is empty", () => {
    expect(() => createImage(makeProps({ backlogItemId: "" }))).toThrow(Error);
  });

  it("throws Error when dataUrl is empty", () => {
    expect(() => createImage(makeProps({ dataUrl: "" }))).toThrow(Error);
  });

  it("throws Error when filename is empty", () => {
    expect(() => createImage(makeProps({ filename: "" }))).toThrow(Error);
  });

  it("throws Error when filename is only whitespace", () => {
    expect(() => createImage(makeProps({ filename: "   " }))).toThrow(Error);
  });

  it("throws Error when mimeType is not an image", () => {
    expect(() => createImage(makeProps({ mimeType: "application/pdf" }))).toThrow(Error);
  });

  it("throws Error when mimeType is empty", () => {
    expect(() => createImage(makeProps({ mimeType: "" }))).toThrow(Error);
  });

  it("throws Error when fileSize exceeds 3 MB", () => {
    expect(() => createImage(makeProps({ fileSize: 4 * 1024 * 1024 }))).toThrow(Error);
  });

  it("accepts fileSize of exactly 3 MB", () => {
    const img = createImage(makeProps({ fileSize: 3 * 1024 * 1024 }));
    expect(img.fileSize).toBe(3 * 1024 * 1024);
  });

  it("trims whitespace from filename", () => {
    const img = createImage(makeProps({ filename: "  foto.png  " }));
    expect(img.filename).toBe("foto.png");
  });
});
