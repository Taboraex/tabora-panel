export enum HttpStatus {
    OK = 200,
    NO_CONTENT = 204,
    FOUND = 302,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    METHOD_NOT_ALLOWED = 405,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    status: number;
    message: string | null;
    body: T | null;
}

const NO_STORE = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
};

export function respond<T>(
    success: boolean,
    status: HttpStatus,
    message?: string,
    body?: T,
    headers: Record<string, string> = {},
): Response {
    const payload: ApiResponse<T> = {
        success,
        status,
        message: message ?? null,
        body: body ?? null,
    };

    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json', ...NO_STORE, ...headers },
    });
}

export const ok = <T>(body?: T, message?: string) =>
    respond(true, HttpStatus.OK, message, body);

export const badRequest = (message: string, body?: unknown) =>
    respond(false, HttpStatus.BAD_REQUEST, message, body);

export const unauthorized = (message = 'Unauthorized or expired session.') =>
    respond(false, HttpStatus.UNAUTHORIZED, message);

export const notFound = (message = 'Not found.') =>
    respond(false, HttpStatus.NOT_FOUND, message);

export const methodNotAllowed = () =>
    respond(false, HttpStatus.METHOD_NOT_ALLOWED, 'Method not allowed.');

export const serverError = (message: string) =>
    respond(false, HttpStatus.INTERNAL_SERVER_ERROR, message);

export function textResponse(
    body: string,
    contentType = 'text/plain; charset=utf-8',
    headers: Record<string, string> = {},
): Response {
    return new Response(body, {
        status: HttpStatus.OK,
        headers: { 'Content-Type': contentType, ...NO_STORE, ...headers },
    });
}

export function htmlResponse(html: string): Response {
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE },
    });
}

/** Subscription payloads need permissive CORS plus a download filename. */
export function subscriptionResponse(
    body: string,
    filename: string,
    contentType = 'text/plain; charset=utf-8',
    extra: Record<string, string> = {},
): Response {
    return new Response(body, {
        status: HttpStatus.OK,
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename=${filename}`,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Profile-Web-Page-Url': '/',
            ...NO_STORE,
            ...extra,
        },
    });
}

export function corsPreflight(): Response {
    return new Response(null, {
        status: HttpStatus.NO_CONTENT,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export const safeError = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);
