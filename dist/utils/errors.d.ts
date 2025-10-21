export declare class AppError extends Error {
    code: string;
    statusCode: number;
    details?: any | undefined;
    constructor(message: string, code: string, statusCode?: number, details?: any | undefined);
}
export declare class IdmlError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
export declare class WebhookError extends Error {
    statusCode?: number | undefined;
    details?: any | undefined;
    constructor(message: string, statusCode?: number | undefined, details?: any | undefined);
}
export declare class ValidationError extends Error {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare function handleError(error: unknown): {
    message: string;
    code?: string;
    statusCode: number;
};
//# sourceMappingURL=errors.d.ts.map