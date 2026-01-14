import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Global error handler middleware
 * Must be registered LAST in middleware chain
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error caught by errorHandler:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    console.error('❌ Error:', err.message);
  }

  // Default error values
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details: any = undefined;

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
    details = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
    
    return res.status(status).json({
      error: message,
      details,
    });
  }

  // Mongoose Duplicate Key Error (11000)
  if (err.code === 11000) {
    status = 400;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field ? `${field} already exists` : 'Duplicate field value';
    
    return res.status(status).json({
      error: message,
      field,
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    
    return res.status(status).json({
      error: message,
    });
  }

  // JWT Errors
  if (err instanceof jwt.TokenExpiredError) {
    status = 401;
    message = 'Token expired. Please login again.';
    
    return res.status(status).json({
      error: 'Token expired',
      message,
    });
  }

  if (err instanceof jwt.JsonWebTokenError) {
    status = 401;
    message = 'Invalid token. Please login again.';
    
    return res.status(status).json({
      error: 'Invalid token',
      message,
    });
  }

  // Rate Limit Error (if using express-rate-limit)
  if (err.name === 'TooManyRequests') {
    status = 429;
    message = 'Too many requests. Please try again later.';
  }

  // Generic error response
  const errorResponse: any = {
    error: message,
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.path = req.path;
    errorResponse.method = req.method;
  }

  res.status(status).json(errorResponse);
};

/**
 * 404 Not Found handler
 * Should be registered BEFORE errorHandler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
