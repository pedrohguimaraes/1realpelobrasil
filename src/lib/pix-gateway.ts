import { createHmac, timingSafeEqual } from "node:crypto";
import { buildMockPixPayload } from "./pix-mock";
import type { CandidateId } from "./types/api";

const DEFAULT_ABACATEPAY_API_BASE_URL = "https://api.abacatepay.com/v2";
const DEFAULT_ABACATEPAY_WEBHOOK_HMAC_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

export type PixGateway = "mock" | "abacatepay";
export type GatewayPaymentStatus = "pending" | "paid" | "expired" | "cancelled";

export type CreatePixChargeInput = {
  voteId: string;
  candidateId: CandidateId;
  candidateName: string;
  amountCents: number;
};

export type PixCharge = {
  gatewayTxId: string;
  pixCopiaCola: string;
  pixQrcodeBase64: string;
};

type AbacatePayChargeResponse = {
  data?: {
    id?: unknown;
    status?: unknown;
    brCode?: unknown;
    brCodeBase64?: unknown;
    expiresAt?: unknown;
  };
  error?: unknown;
  success?: unknown;
};

type AbacatePayStatusResponse = {
  data?: {
    id?: unknown;
    status?: unknown;
    expiresAt?: unknown;
  };
  error?: unknown;
  success?: unknown;
};

export type AbacatePayTransparentWebhook = {
  event: string;
  gatewayTxId: string;
  externalId: string | null;
  status: string | null;
  paidAt: Date | null;
};

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "sim", "on"].includes(value);
}

function readPositiveIntEnv(name: string): number | undefined {
  const value = readOptionalEnv(name);
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} deve ser um número inteiro positivo.`);
  }
  return parsed;
}

function parseJsonObjectEnv(name: string): Record<string, unknown> {
  const value = readOptionalEnv(name);
  if (!value) return {};
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${name} deve ser um objeto JSON.`);
  }
  return parsed as Record<string, unknown>;
}

function getAbacatePayApiKey(): string {
  const apiKey = readOptionalEnv("ABACATEPAY_API_KEY");
  if (!apiKey) {
    throw new Error("ABACATEPAY_API_KEY não está definida.");
  }
  return apiKey;
}

function getAbacatePayBaseUrl(): string {
  return (readOptionalEnv("ABACATEPAY_API_BASE_URL") ?? DEFAULT_ABACATEPAY_API_BASE_URL)
    .replace(/\/+$/, "");
}

export function getPixGateway(): PixGateway {
  const configured = readOptionalEnv("PIX_GATEWAY")?.toLowerCase();
  if (configured === "mock" || configured === "abacatepay") return configured;
  if (configured) {
    throw new Error("PIX_GATEWAY deve ser 'mock' ou 'abacatepay'.");
  }
  return readOptionalEnv("ABACATEPAY_API_KEY") ? "abacatepay" : "mock";
}

export function isAbacatePayGateway(): boolean {
  return getPixGateway() === "abacatepay";
}

export function getAbacatePayWebhookSecret(): string | undefined {
  return readOptionalEnv("ABACATEPAY_WEBHOOK_SECRET") ?? readOptionalEnv("WEBHOOK_SECRET");
}

export function shouldRequireAbacatePayWebhookSignature(): boolean {
  return readBooleanEnv(
    "ABACATEPAY_WEBHOOK_REQUIRE_SIGNATURE",
    process.env.NODE_ENV === "production"
  );
}

function getAbacatePayWebhookHmacKey(): string {
  return readOptionalEnv("ABACATEPAY_WEBHOOK_HMAC_KEY") ?? DEFAULT_ABACATEPAY_WEBHOOK_HMAC_KEY;
}

function amountToBRL(amountCents: number): string {
  return (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function renderTemplate(
  template: string,
  input: CreatePixChargeInput
): string {
  const values: Record<string, string> = {
    voteId: input.voteId,
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    amountCents: String(input.amountCents),
    amountBRL: amountToBRL(input.amountCents),
  };

  return template.replace(
    /\{(voteId|candidateId|candidateName|amountCents|amountBRL)\}/g,
    (_, key: string) => values[key] ?? ""
  );
}

function buildAbacatePayMetadata(
  input: CreatePixChargeInput
): Record<string, unknown> {
  return {
    ...parseJsonObjectEnv("ABACATEPAY_PIX_METADATA_JSON"),
    app: "1realpelobrasil",
    voteId: input.voteId,
    candidateId: input.candidateId,
    candidateName: input.candidateName,
  };
}

function buildAbacatePayUtm(): Record<string, string> | undefined {
  const utm = {
    source: readOptionalEnv("ABACATEPAY_PIX_UTM_SOURCE"),
    medium: readOptionalEnv("ABACATEPAY_PIX_UTM_MEDIUM"),
    campaign: readOptionalEnv("ABACATEPAY_PIX_UTM_CAMPAIGN"),
    term: readOptionalEnv("ABACATEPAY_PIX_UTM_TERM"),
    content: readOptionalEnv("ABACATEPAY_PIX_UTM_CONTENT"),
  };

  const entries = Object.entries(utm).filter(
    (entry): entry is [string, string] => Boolean(entry[1])
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function normalizeQrCodeBase64(value: string): string {
  return value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseIsoDate(value: unknown): Date | null {
  const raw = asString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

function stringifyGatewayError(error: unknown): string {
  if (!error) return "Erro desconhecido";
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Erro desconhecido";
  }
}

function normalizeGatewayStatus(status: string | null): GatewayPaymentStatus | null {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return "pending";
    case "PAID":
      return "paid";
    case "EXPIRED":
      return "expired";
    case "CANCELLED":
      return "cancelled";
    default:
      return null;
  }
}

export function isAbacatePayPaidStatus(status: string | null): boolean {
  return normalizeGatewayStatus(status) === "paid";
}

async function createAbacatePayPixCharge(
  input: CreatePixChargeInput
): Promise<PixCharge> {
  const descriptionTemplate =
    readOptionalEnv("ABACATEPAY_PIX_DESCRIPTION") ??
    "Voto beneficente 1 Real pelo Brasil - {candidateName}";
  const data: Record<string, unknown> = {
    amount: input.amountCents,
    externalId: input.voteId,
    description: renderTemplate(descriptionTemplate, input),
    metadata: buildAbacatePayMetadata(input),
  };

  const expiresIn = readPositiveIntEnv("ABACATEPAY_PIX_EXPIRES_IN");
  if (expiresIn) data.expiresIn = expiresIn;

  const utm = buildAbacatePayUtm();
  if (utm) data.utm = utm;

  const response = await fetch(`${getAbacatePayBaseUrl()}/transparents/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAbacatePayApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      method: "PIX",
      data,
    }),
  });
  const body = await readJsonResponse<AbacatePayChargeResponse>(response);

  if (!response.ok || body.error) {
    throw new Error(
      `AbacatePay recusou a cobrança PIX (${response.status}): ${stringifyGatewayError(body.error)}`
    );
  }

  const gatewayTxId = asString(body.data?.id);
  const pixCopiaCola = asString(body.data?.brCode);
  const qrCode = asString(body.data?.brCodeBase64);
  if (!gatewayTxId || !pixCopiaCola || !qrCode) {
    throw new Error("Resposta da AbacatePay não trouxe id, brCode ou brCodeBase64.");
  }

  return {
    gatewayTxId,
    pixCopiaCola,
    pixQrcodeBase64: normalizeQrCodeBase64(qrCode),
  };
}

export async function createPixCharge(input: CreatePixChargeInput): Promise<PixCharge> {
  if (isAbacatePayGateway()) {
    return createAbacatePayPixCharge(input);
  }
  return buildMockPixPayload(input.amountCents);
}

export async function checkAbacatePayPixStatus(
  gatewayTxId: string
): Promise<GatewayPaymentStatus | null> {
  const url = new URL(`${getAbacatePayBaseUrl()}/transparents/check`);
  url.searchParams.set("id", gatewayTxId);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getAbacatePayApiKey()}`,
    },
  });
  const body = await readJsonResponse<AbacatePayStatusResponse>(response);
  if (!response.ok || body.error) {
    throw new Error(
      `AbacatePay recusou a consulta PIX (${response.status}): ${stringifyGatewayError(body.error)}`
    );
  }

  return normalizeGatewayStatus(asString(body.data?.status));
}

export async function simulateAbacatePayPixPayment(gatewayTxId: string): Promise<void> {
  const url = new URL(`${getAbacatePayBaseUrl()}/transparents/simulate-payment`);
  url.searchParams.set("id", gatewayTxId);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAbacatePayApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      metadata: {
        gatewayTxId,
        source: "1realpelobrasil",
      },
    }),
  });
  const body = await readJsonResponse<AbacatePayStatusResponse>(response);
  if (!response.ok || body.error) {
    throw new Error(
      `AbacatePay recusou a simulação PIX (${response.status}): ${stringifyGatewayError(body.error)}`
    );
  }
}

export function verifyAbacatePayWebhookSignature(
  rawBody: string,
  signatureFromHeader: string | null
): boolean {
  if (!signatureFromHeader) return false;
  const expected = createHmac("sha256", getAbacatePayWebhookHmacKey())
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signatureFromHeader);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function parseAbacatePayTransparentWebhook(
  payload: unknown
): AbacatePayTransparentWebhook | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const transparent = asRecord(data?.transparent);
  if (!root || !data || !transparent) return null;

  const event = asString(root.event);
  const gatewayTxId = asString(transparent.id);
  if (!event || !gatewayTxId) return null;

  return {
    event,
    gatewayTxId,
    externalId: asString(transparent.externalId),
    status: asString(transparent.status),
    paidAt: parseIsoDate(transparent.updatedAt),
  };
}
