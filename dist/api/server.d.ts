import express from 'express';
import { WebhookConfig } from '../types/index.js';
export declare class ApiServer {
    private app;
    private translationService;
    constructor(webhookConfig: WebhookConfig);
    private setupMiddleware;
    private setupRoutes;
    start(port?: number): void;
    getApp(): express.Application;
}
//# sourceMappingURL=server.d.ts.map