export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const notFound = (what = 'Resource') =>
  new AppError(404, 'not_found', `${what} not found.`);

export const unauthorized = (message = 'Sign in to continue.') =>
  new AppError(401, 'unauthorized', message);

export const forbiddenOrigin = () => new AppError(403, 'forbidden_origin', 'Request origin is not allowed.');

export const conflict = (message: string, fields?: Record<string, string>) =>
  new AppError(409, 'conflict', message, fields);

export const invalid = (message: string, fields?: Record<string, string>) =>
  new AppError(422, 'invalid_input', message, fields);

export const tooManyRequests = () =>
  new AppError(429, 'rate_limited', 'Too many attempts. Try again in a minute.');
