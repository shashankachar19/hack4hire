// ============================================================================
// DispatchGrid — Global Error Handler Middleware
// Catches all unhandled errors and returns a consistent API response format:
//   { success: false, error: { code, message, details } }
//
// Handles:
// - Zod validation errors (input validation failures)
// - Prisma known errors (constraint violations, not found, etc.)
// - Custom AppError (thrown by controllers/services with specific codes)
// - Unknown errors (500 Internal Server Error)
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiResponse } from '../types';

// ============================================================================
// Custom Error Class
// Controllers and services throw AppError for domain-specific errors.
// ============================================================================

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ============================================================================
// Error Handler Middleware
// Must have 4 parameters for Express to recognize it as an error handler.
// ============================================================================

export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ---- Zod Validation Errors ----
  // These occur when request body/params fail schema validation.
  if (err instanceof ZodError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      },
    };
    res.status(400).json(response);
    return;
  }

  // ---- Custom Application Errors ----
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // ---- Prisma Known Request Errors ----
  // See: https://www.prisma.io/docs/reference/api-reference/error-reference
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: `DB_${err.code}`,
        message: getPrismaErrorMessage(err),
        details: { prismaCode: err.code, meta: err.meta },
      },
    };
    const statusCode = getPrismaStatusCode(err.code);
    res.status(statusCode).json(response);
    return;
  }

  // ---- Prisma Validation Errors ----
  if (err instanceof Prisma.PrismaClientValidationError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DB_VALIDATION_ERROR',
        message: 'Database query validation failed',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
    };
    res.status(400).json(response);
    return;
  }

  // ---- Unknown / Unexpected Errors ----
  console.error('[DispatchGrid] Unhandled error:', err);
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
  };
  res.status(500).json(response);
}

// ============================================================================
// Helpers for Prisma error mapping
// ============================================================================

/**
 * Map Prisma error codes to human-readable messages.
 */
function getPrismaErrorMessage(err: Prisma.PrismaClientKnownRequestError): string {
  switch (err.code) {
    case 'P2002':
      return `Unique constraint violation on: ${(err.meta?.target as string[])?.join(', ') || 'unknown field'}`;
    case 'P2025':
      return 'Record not found';
    case 'P2003':
      return 'Foreign key constraint violation — referenced record does not exist';
    case 'P2014':
      return 'The change would violate a required relation';
    default:
      return `Database error: ${err.message}`;
  }
}

/**
 * Map Prisma error codes to HTTP status codes.
 */
function getPrismaStatusCode(code: string): number {
  switch (code) {
    case 'P2002': return 409; // Conflict (unique violation)
    case 'P2025': return 404; // Not Found
    case 'P2003': return 400; // Bad Request (FK violation)
    default: return 500;
  }
}
