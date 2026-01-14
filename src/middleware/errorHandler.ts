//src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    status = 400;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field ? `${field} already exists` : 'Duplicate field value';
    
    return res.status(status).json({
      error: message,
      field,
    });
  }

  // Mongoose CastError
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
    
    return res.status(status).json({
      error: message,
    });
  }

  // JWT Errors
  if (err instanceof jwt.TokenExpiredError) {
    status = 401;
    message = 'Token expired';
    
    return res.status(status).json({
      error: message,
    });
  }

  if (err instanceof jwt.JsonWebTokenError) {
    status = 401;
    message = 'Invalid token';
    
    return res.status(status).json({
      error: message,
    });
  }

  // Rate Limit Error
  if (err.name === 'TooManyRequests') {
    status = 429;
    message = 'Too many requests. Please try again later.';
  }

  res.status(status).json({
    error: message,
  });
};

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

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};