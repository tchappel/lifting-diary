import "server-only";
import { auth } from "@clerk/nextjs/server";
import { cache } from "react";

/**
 * Custom error for unauthorized requests (no userId in session)
 */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Custom error for forbidden access (user doesn't own resource)
 */
export class ForbiddenError extends Error {
  constructor(message = "Forbidden: Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Cached authentication helper for data layer.
 *
 * - Uses lightweight auth() check (middleware already validated session)
 * - Cached per-request with React cache()
 * - Throws UnauthorizedError if no userId
 *
 * @throws {UnauthorizedError} if no userId
 * @returns {Promise<{ userId: string }>}
 */
export const authClient = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new UnauthorizedError();
  }

  return { userId };
});
