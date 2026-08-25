import { SignJWT, jwtVerify } from 'jose';
import { Store } from '@storage/db';
import { randomHex } from '@common/utils';
import { SESSION_TTL, SESSION_TTL_SECONDS } from '@config/constants';

const SECRET_KEY = 'jwt-secret';
const COOKIE_NAME = 'tabora_session';

async function getSecret(store: Store): Promise<Uint8Array> {
    let secret = await store.get(SECRET_KEY);
    if (!secret) {
        secret = randomHex(32);
        await store.put(SECRET_KEY, secret);
    }
    return new TextEncoder().encode(secret);
}

export async function issueToken(store: Store, subject: string): Promise<string> {
    const secret = await getSecret(store);
    return new SignJWT({ sub: subject, role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(SESSION_TTL)
        .sign(secret);
}

export function sessionCookie(token: string): string {
    return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearCookie(): string {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function readCookie(request: Request): string | null {
    const cookie = request.headers.get('Cookie');
    if (!cookie) return null;
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
    return match ? match[1] : null;
}

/** Verify the session cookie (or a Bearer token). Returns false on any failure. */
export async function verifySession(request: Request, store: Store): Promise<boolean> {
    try {
        const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
        const token = readCookie(request) ?? bearer;
        if (!token) return false;

        const secret = await getSecret(store);
        await jwtVerify(token, secret);
        return true;
    } catch {
        return false;
    }
}

/** Invalidate every existing session by rotating the signing secret. */
export async function rotateSecret(store: Store): Promise<void> {
    await store.put(SECRET_KEY, randomHex(32));
}
