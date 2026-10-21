import { describe, expect, it } from "vitest";
import { GreetingRequest, GreetingResponse } from "./index.ts";

describe("GreetingRequest (EX-1)", () => {
  it("accepts a name and defaults formal to false", () => {
    expect(GreetingRequest.parse({ name: "Ada" })).toEqual({ name: "Ada", formal: false });
  });

  it("trims the name", () => {
    expect(GreetingRequest.parse({ name: "  Ada  ", formal: true }).name).toBe("Ada");
  });

  it("rejects a missing, empty, or non-string name", () => {
    expect(GreetingRequest.safeParse({}).success).toBe(false);
    expect(GreetingRequest.safeParse({ name: "   " }).success).toBe(false);
    expect(GreetingRequest.safeParse({ name: 42 }).success).toBe(false);
  });
});

describe("GreetingResponse (EX-2)", () => {
  it("requires a message", () => {
    expect(GreetingResponse.safeParse({}).success).toBe(false);
    expect(GreetingResponse.parse({ message: "Hello, Ada." })).toEqual({ message: "Hello, Ada." });
  });
});
