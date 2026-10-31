import type { Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { badRequest } from './errors';

export function ok<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>) {
  res.status(status).json(meta ? { data, meta } : { data });
}

export function pageMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

function parse<S extends ZodTypeAny>(schema: S, input: unknown, where: string): z.output<S> {
  const r = schema.safeParse(input);
  if (!r.success) {
    throw badRequest("Kiritilgan ma'lumotlar noto'g'ri.", r.error.flatten(), `INVALID_${where}`);
  }
  return r.data;
}

export const body = <S extends ZodTypeAny>(req: Request, schema: S) =>
  parse(schema, req.body, 'BODY');
export const query = <S extends ZodTypeAny>(req: Request, schema: S) =>
  parse(schema, req.query, 'QUERY');

export function param(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || !/^[0-9a-f-]{36}$/i.test(v)) throw badRequest(`Noto'g'ri ${name}.`);
  return v;
}

export function clientIp(req: Request): string | undefined {
  return req.ip ?? undefined;
}
