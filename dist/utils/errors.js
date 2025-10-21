export class AppError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
export class IdmlError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'IdmlError';
    }
}
export class WebhookError extends Error {
    statusCode;
    details;
    constructor(message, statusCode, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'WebhookError';
    }
}
export class ValidationError extends Error {
    field;
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = 'ValidationError';
    }
}
export function handleError(error) {
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
//# sourceMappingURL=errors.js.map