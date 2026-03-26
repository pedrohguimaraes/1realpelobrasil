import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Limite de centavos por voto (ex.: R$ 50.000) — evita abuso e overflow em agregações. */
export const MAX_AMOUNT_CENTS = 5_000_000;

/** Tamanho máximo do corpo JSON em rotas públicas (bytes). */
export const MAX_JSON_BODY_BYTES = 16_384;

const WINDOW_MS = 60_000;

type Bucket = { count: number; resetAt: number };

const voteCreateBuckets = new Map<string, Bucket>();
const votePollBuckets = new Map<string, Bucket>();
const candidatesReadBuckets = new Map<string, Bucket>();
const statsReadBuckets = new Map<string, Bucket>();

function pruneAndCheck(
  map: Map<string, Bucket>,
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let b = map.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 1, resetAt: now + windowMs };
    map.set(key, b);
    return { ok: true };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true };
}

/**
 * IP do cliente (proxy / Vercel / local). Usado só para rate limit best-effort.
 */
export function getClientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real?.trim()) return real.trim();
  return "unknown";
}

/** POST /api/votes — criação de cobrança. */
export function rateLimitVoteCreate(ip: string) {
  return pruneAndCheck(voteCreateBuckets, `vote:${ip}`, 30, 10 * WINDOW_MS);
}

/** GET /api/votes/[id] — polling. */
export function rateLimitVotePoll(ip: string) {
  return pruneAndCheck(votePollBuckets, `poll:${ip}`, 120, WINDOW_MS);
}

/** GET /api/candidates */
export function rateLimitCandidatesRead(ip: string) {
  return pruneAndCheck(candidatesReadBuckets, ip, 200, WINDOW_MS);
}

/** GET /api/stats */
export function rateLimitStatsRead(ip: string) {
  return pruneAndCheck(statsReadBuckets, ip, 200, WINDOW_MS);
}

export function tooManyRequests(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Muitas requisições. Tente novamente em instantes." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

/**
 * Rejeita corpos JSON grandes antes de parse (DoS leve / erros acidentais).
 */
export async function assertJsonBodyWithinLimit(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const len = request.headers.get("content-length");
  if (len) {
    const n = Number(len);
    if (Number.isFinite(n) && n > maxBytes) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Corpo da requisição muito grande." },
          { status: 413 }
        ),
      };
    }
  }
  return { ok: true };
}

export function compareSecretConstantTime(
  received: string | null,
  expected: string
): boolean {
  if (!received) return false;
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
