import { GreetingRequest, GreetingResponse } from "@app/contracts";

/**
 * Answers a greeting request. The body arrives as unknown and is parsed at the boundary, so a
 * malformed request fails here with a Zod error instead of deep inside the service (spec: EX-3).
 */
export function greet(body: unknown): GreetingResponse {
  const request = GreetingRequest.parse(body);
  const message = request.formal ? `Good day, ${request.name}.` : `Hello, ${request.name}.`;
  return GreetingResponse.parse({ message });
}
