import { createHmac, timingSafeEqual } from "node:crypto";
import {
  createPixPaymentClient,
  getPixPaymentProvider,
  isPaidPixStatus,
  type CreatePixPaymentInput,
  type PixPaymentProvider,
  type PixPaymentStatus,
} from "@/lib/payments/pix";

export type PixGateway = PixPaymentProvider;
export type GatewayPaymentStatus = PixPaymentStatus;
export type CreatePixChargeInput = CreatePixPaymentInput;

export type PixCharge = {
  gatewayTxId: string;
  pixCopiaCola: string;
  pixQrcodeBase64: string;
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

function normalizeGatewayStatus(status: string | null): GatewayPaymentStatus {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return "pending";
    case "PAID":
      return "paid";
    case "EXPIRED":
      return "expired";
    case "CANCELLED":
      return "cancelled";
    case "REFUNDED":
      return "refunded";
    default:
      return "unknown";
  }
}

export function getPixGateway(): PixGateway {
  return getPixPaymentProvider();
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

// Chave HMAC PÚBLICA da AbacatePay (publicada na doc oficial, igual para todos
// os comerciantes). Não é segredo: serve só para integridade do payload, não
// autentica o remetente — quem autentica é o ABACATEPAY_WEBHOOK_SECRET na query
// string. Mantida como fallback; sobrescreva por env se a AbacatePay rotacionar.
// https://docs.abacatepay.com/pages/webhooks
const ABACATEPAY_PUBLIC_HMAC_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

function getAbacatePayWebhookHmacKey(): string {
  return readOptionalEnv("ABACATEPAY_WEBHOOK_HMAC_KEY") ?? ABACATEPAY_PUBLIC_HMAC_KEY;
}

export function isAbacatePayPaidStatus(status: string | null): boolean {
  return isPaidPixStatus(normalizeGatewayStatus(status));
}

export async function createPixCharge(input: CreatePixChargeInput): Promise<PixCharge> {
  const pix = await createPixPaymentClient().createPix(input);
  return {
    gatewayTxId: pix.gatewayTxId,
    pixCopiaCola: pix.pixCopiaCola,
    pixQrcodeBase64: pix.pixQrcodeBase64,
  };
}

export async function checkAbacatePayPixStatus(
  gatewayTxId: string
): Promise<GatewayPaymentStatus | null> {
  return createPixPaymentClient("abacatepay").checkStatus(gatewayTxId);
}

export async function simulateAbacatePayPixPayment(gatewayTxId: string): Promise<void> {
  await createPixPaymentClient("abacatepay").simulatePayment(gatewayTxId);
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
  const payment =
    asRecord(data?.transparent) ??
    asRecord(data?.pixQrCode) ??
    asRecord(data?.billing);
  if (!root || !data || !payment) return null;

  const event = asString(root.event);
  const gatewayTxId = asString(payment.id);
  if (!event || !gatewayTxId) return null;

  return {
    event,
    gatewayTxId,
    externalId: asString(payment.externalId),
    status: asString(payment.status),
    paidAt: parseIsoDate(payment.updatedAt),
  };
}
