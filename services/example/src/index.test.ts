import { describe, expect, it } from "vitest";
import { greet } from "./index.ts";

describe("greet (EX-3)", () => {
  it("answers a valid request", () => {
    expect(greet({ name: "Ada" })).toEqual({ message: "Hello, Ada." });
    expect(greet({ name: "Ada", formal: true })).toEqual({ message: "Good day, Ada." });
  });

  it("rejects a malformed request at the boundary", () => {
    expect(() => greet({ name: "" })).toThrow();
    expect(() => greet("Ada")).toThrow();
  });
});
