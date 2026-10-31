import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Manzil topilmadi.' } });
}

// Express recognises error handlers by arity, so `_next` must stay.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(status).json({
      error: { code: err.code, message: 'Fayl yuklashda xatolik: hajm yoki format mos emas.' },
    });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res
        .status(409)
        .json({ error: { code: 'CONFLICT', message: 'Bunday yozuv allaqachon mavjud.' } });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({
        error: {
          code: 'HAS_DEPENDENCIES',
          message: "Bog'liq yozuvlar mavjud — avval ularni o'chiring.",
        },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Yozuv topilmadi.' } });
      return;
    }
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: "So'rov tanasi noto'g'ri JSON." } });
    return;
  }
  logger.error('unhandled error', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
  });
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Ichki xatolik yuz berdi.' } });
}
