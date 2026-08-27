/// <reference types="@cloudflare/workers-types" />

declare global {
    /** Injected by the build script. */
    const VERSION: string;

    /** gzip+base64 asset blobs injected by the build script. */
    const PANEL_HTML: string;
    const LOGIN_HTML: string;
    const SUBSCRIPTION_HTML: string;
    const ERROR_HTML: string;

    interface Env {
        DB?: D1Database;
        KV?: KVNamespace;
        ADMIN_PASSWORD?: string;
        SECURE_PATH?: string;
        UUID?: string;
        TROJAN_PASSWORD?: string;
        FALLBACK?: string;
        PROXY_IP?: string;
        CF_ACCOUNT_ID?: string;
        CF_API_TOKEN?: string;
        BOT_TOKEN?: string;
        TELEGRAM_BOT_TOKEN?: string;
        TELEGRAM_ADMIN_ID?: string;
        /** Injected by the Telegram launcher so the bot can manage this panel. */
        BOT_KEY?: string;
        /** Telegram user id of the operator who installed this panel. */
        TELEGRAM_OWNER?: string;
    }

    interface Array<T> {
        /** Append `items` only when `condition` holds. Keeps config builders terse. */
        concatIf(condition: boolean, ...items: T[]): T[];
    }
}

export {};
