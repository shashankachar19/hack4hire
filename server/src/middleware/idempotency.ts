// ============================================================================
// DispatchGrid — Idempotency Middleware (Module G)
// Prevents duplicate job creation when clients retry POST requests.
//
// How it works:
// 1. Client sends `Idempotency-Key` header with a unique key (e.g., UUID)
// 2. If we've seen this key before and it hasn't expired, return the cached response
// 3. If it's new, let the request proceed, then cache the response body + status
// 4. Keys expire after 24 hours (configurable via IDEMPOTENCY_TTL_HOURS)
//
// This middleware ONLY applies to POST routes (job creation). GET/PATCH are
// naturally idempotent and don't need this protection.
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/db';

const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * Express middleware for idempotent POST requests.
 * Attach this to POST routes that create resources (e.g., POST /api/jobs).
 */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only process requests that carry an idempotency key
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!idempotencyKey) {
    // No key provided — proceed normally (non-idempotent request)
    next();
    return;
  }

  handleIdempotency(idempotencyKey, req, res, next).catch(next);
}

async function handleIdempotency(
  key: string,
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // ------------------------------------------------------------------
  // Step 1: Check if we already have a cached response for this key
  // ------------------------------------------------------------------
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key },
  });

  if (existing) {
    // Check if the cached response has expired
    if (new Date() > existing.expiresAt) {
      // Expired — delete the old record and let the request proceed fresh
      await prisma.idempotencyKey.delete({ where: { key } });
    } else {
      // Valid cached response — return it directly without hitting the controller
      const cachedBody = JSON.parse(existing.response);
      res.status(existing.statusCode).json(cachedBody);
      return;
    }
  }

  // ------------------------------------------------------------------
  // Step 2: Key is new (or expired) — intercept the response to cache it
  // We monkey-patch res.json() to capture the response body before sending.
  // ------------------------------------------------------------------
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown): Response {
    // Cache the response asynchronously — don't block the response
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + IDEMPOTENCY_TTL_HOURS);

    prisma.idempotencyKey
      .create({
        data: {
          key,
          response: JSON.stringify(body),
          statusCode: res.statusCode,
          expiresAt,
        },
      })
      .catch((err) => {
        // Log but don't fail the request — caching is best-effort
        console.error('[Idempotency] Failed to cache response:', err.message);
      });

    // Send the response using the original method
    return originalJson(body);
  } as typeof res.json;

  next();
}

export default idempotencyMiddleware;
