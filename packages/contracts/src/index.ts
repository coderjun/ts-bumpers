import { z } from "zod";

// Every request, response, and event that crosses a service boundary is defined here first, as a
// Zod schema with its inferred type. Services parse with these schemas at every boundary.

/** A request to greet someone (spec: EX-1). */
export const GreetingRequest = z.object({
  name: z.string().trim().min(1).max(100),
  formal: z.boolean().default(false),
});
export type GreetingRequest = z.infer<typeof GreetingRequest>;

/** The answer to a greeting request (spec: EX-2). */
export const GreetingResponse = z.object({
  message: z.string(),
});
export type GreetingResponse = z.infer<typeof GreetingResponse>;
