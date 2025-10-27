import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  if (req.accepts('html')) {
    res.status(statusCode).render('error', {
      title: 'Error',
      message,
      statusCode,
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  } else {
    res.status(statusCode).json({
      status: 'error',
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
};
