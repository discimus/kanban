import { describe, it, expect } from "vitest";
import { createEstimation } from "@contexts/estimation/domain/estimation-log";

describe("createEstimation", () => {
  it("returns an EstimationLog with generated id", () => {
    const estimation = createEstimation({ taskId: "t-1", estimate: 5 });
    expect(estimation.id).toBeTypeOf("string");
    expect(estimation.id.length).toBeGreaterThan(0);
  });

  it("returns createdAt as ISO string", () => {
    const estimation = createEstimation({ taskId: "t-1", estimate: 5 });
    expect(estimation.createdAt).toBeTypeOf("string");
    expect(() => new Date(estimation.createdAt)).not.toThrow();
  });

  it("stores estimate value correctly", () => {
    const estimation = createEstimation({ taskId: "t-1", estimate: 5 });
    expect(estimation.estimate).toBe(5);
  });

  it('comment defaults to "" when not provided', () => {
    const estimation = createEstimation({ taskId: "t-1", estimate: 5 });
    expect(estimation.comment).toBe("");
  });

  it("trims comment whitespace", () => {
    const estimation = createEstimation({ taskId: "t-1", estimate: 5, comment: "  Good job  " });
    expect(estimation.comment).toBe("Good job");
  });

  it("throws Error when taskId is empty", () => {
    expect(() => createEstimation({ taskId: "", estimate: 5 })).toThrow(Error);
  });

  it("throws Error when estimate is negative", () => {
    expect(() => createEstimation({ taskId: "t-1", estimate: -1 })).toThrow(Error);
  });

  it("throws Error when estimate is NaN", () => {
    expect(() => createEstimation({ taskId: "t-1", estimate: NaN })).toThrow(Error);
  });

  it("throws Error when estimate is Infinity", () => {
    expect(() => createEstimation({ taskId: "t-1", estimate: Infinity })).toThrow(Error);
  });
});
