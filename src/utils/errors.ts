export class AppError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 500, public details?: any) {
    super(message);
    this.name = 'AppError';
  }
}

export class IdmlError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'IdmlError';
  }
}

export class WebhookError extends Error {
  constructor(message: string, public statusCode?: number, public details?: any) {
    super(message);
    this.name = 'WebhookError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function handleError(error: unknown): { message: string; code?: string; statusCode: number } {
  if (error instanceof IdmlError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: 400
    };
  }

  if (error instanceof WebhookError) {
    return {
      message: error.message,
      statusCode: error.statusCode || 500
    };
  }

  if (error instanceof ValidationError) {
    return {
      message: error.message,
      statusCode: 400
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500
    };
  }

  return {
    message: 'An unknown error occurred',
    statusCode: 500
  };
}
