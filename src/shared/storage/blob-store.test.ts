import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { putBlob, getBlob, deleteBlob, clearBlobs, getAllBlobKeys, countBlobBytes, dataUrlToBlob, blobToDataUrl } from "./blob-store";

beforeEach(async () => {
  await clearBlobs();
});

describe("blob-store", () => {
  it("puts and gets a blob", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    await putBlob("k1", blob);
    const got = await getBlob("k1");
    expect(got).not.toBeNull();
    expect(await got!.text()).toBe("hello");
    expect(got!.type).toBe("text/plain");
  });

  it("returns null for a missing key", async () => {
    expect(await getBlob("missing")).toBeNull();
  });

  it("overwrites an existing key", async () => {
    await putBlob("k1", new Blob(["old"]));
    await putBlob("k1", new Blob(["new"]));
    expect(await (await getBlob("k1"))!.text()).toBe("new");
  });

  it("deletes a blob", async () => {
    await putBlob("k1", new Blob(["x"]));
    await deleteBlob("k1");
    expect(await getBlob("k1")).toBeNull();
  });

  it("counts total blob bytes", async () => {
    await putBlob("k1", new Blob(["hello"]));
    await putBlob("k2", new Blob(["world"]));
    expect(await countBlobBytes()).toBe(10);
  });

  it("lists all keys", async () => {
    await putBlob("k1", new Blob(["a"]));
    await putBlob("k2", new Blob(["b"]));
    expect((await getAllBlobKeys()).sort()).toEqual(["k1", "k2"]);
  });

  it("clears all blobs", async () => {
    await putBlob("k1", new Blob(["a"]));
    await clearBlobs();
    expect(await countBlobBytes()).toBe(0);
    expect(await getAllBlobKeys()).toEqual([]);
  });

  it("converts a dataUrl to a blob preserving type and content", async () => {
    const blob = dataUrlToBlob("data:audio/webm;base64,aGVsbG8=");
    expect(blob.type).toBe("audio/webm");
    expect(await blob.text()).toBe("hello");
  });

  it("round-trips blob -> dataUrl -> blob", async () => {
    const original = new Blob(["abc"], { type: "audio/mp4" });
    const dataUrl = await blobToDataUrl(original);
    expect(dataUrl.startsWith("data:audio/mp4;base64,")).toBe(true);
    const restored = dataUrlToBlob(dataUrl);
    expect(await restored.text()).toBe("abc");
    expect(restored.type).toBe("audio/mp4");
  });
});
