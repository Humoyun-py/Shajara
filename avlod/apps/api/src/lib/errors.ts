export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown, code = 'BAD_REQUEST') =>
  new AppError(400, code, message, details);
export const unauthorized = (message = 'Tizimga kirish talab qilinadi.') =>
  new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = "Bu amal uchun ruxsatingiz yo'q.") =>
  new AppError(403, 'FORBIDDEN', message);
// Unknown and inaccessible resources both answer 404, so ids from other families cannot be probed.
export const notFound = (what = 'Resurs') => new AppError(404, 'NOT_FOUND', `${what} topilmadi.`);
export const conflict = (message: string, code = 'CONFLICT') => new AppError(409, code, message);
export const tooMany = (message = "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.") =>
  new AppError(429, 'TOO_MANY_REQUESTS', message);
