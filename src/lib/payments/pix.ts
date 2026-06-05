import { AbacatePay } from "@abacatepay/sdk";
import { buildMockPixPayload } from "@/lib/pix-mock";
import type { CandidateId } from "@/lib/types/api";

export type PixPaymentProvider = "mock" | "abacatepay";
export type PixPaymentStatus =
  | "pending"
  | "paid"
  | "expired"
  | "cancelled"
  | "refunded"
  | "unknown";

export type CreatePixPaymentInput = {
  voteId: string;
  candidateId: CandidateId;
  candidateName: string;
  amountCents: number;
};

export type PixPayment = {
  provider: PixPaymentProvider;
  gatewayTxId: string;
  pixCopiaCola: string;
  pixQrcodeBase64: string;
  status: PixPaymentStatus;
  raw: unknown;
};

export interface PixPaymentClient {
  readonly provider: PixPaymentProvider;
  createPix(input: CreatePixPaymentInput): Promise<PixPayment>;
  checkStatus(gatewayTxId: string): Promise<PixPaymentStatus | null>;
  simulatePayment(gatewayTxId: string): Promise<void>;
}

type AbacatePayClient = ReturnType<typeof AbacatePay>;

// O SDK expõe o client REST bruto em runtime, mas os tipos publicados no
// pacote não declaram a propriedade `rest`.
type AbacatePayRestClient = {
  post(route: string, options: { body: unknown }): Promise<unknown>;
};

function getRestClient(client: AbacatePayClient): AbacatePayRestClient {
  return (client as unknown as { rest: AbacatePayRestClient }).rest;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
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

function amountToBRL(amountCents: number): string {
  return (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function renderTemplate(template: string, input: CreatePixPaymentInput): string {
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

function buildMetadata(input: CreatePixPaymentInput): Record<string, unknown> {
  return {
    ...parseJsonObjectEnv("ABACATEPAY_PIX_METADATA_JSON"),
    app: "1realpelobrasil",
    voteId: input.voteId,
    candidateId: input.candidateId,
    candidateName: input.candidateName,
  };
}

function normalizeQrCodeBase64(value: string): string {
  return value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function normalizeStatus(status: string | null | undefined): PixPaymentStatus {
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

function createAbacatePayClient(): AbacatePayClient {
  return AbacatePay({ secret: getAbacatePayApiKey() });
}

export class AbacatePayPixPaymentClient implements PixPaymentClient {
  readonly provider = "abacatepay" as const;

  constructor(private readonly client: AbacatePayClient = createAbacatePayClient()) {}

  async createPix(input: CreatePixPaymentInput): Promise<PixPayment> {
    const descriptionTemplate =
      readOptionalEnv("ABACATEPAY_PIX_DESCRIPTION") ??
      "Voto beneficente 1 Real pelo Brasil - {candidateName}";

    // O SDK 1.2.0 envia o body "flat" para /transparents/create, mas a API v2
    // exige o envelope { method: "PIX", data: {...} } — sem ele a API responde
    // "Value should be one of 'object', 'object'". Usamos o client REST direto.
    const pix = (await getRestClient(this.client).post("/transparents/create", {
      body: {
        method: "PIX",
        data: {
          amount: input.amountCents,
          externalId: input.voteId,
          expiresIn: readPositiveIntEnv("ABACATEPAY_PIX_EXPIRES_IN"),
          description: renderTemplate(descriptionTemplate, input),
          metadata: buildMetadata(input),
        },
      },
    })) as Awaited<ReturnType<AbacatePayClient["pix"]["create"]>>;

    return {
      provider: this.provider,
      gatewayTxId: pix.id,
      pixCopiaCola: pix.brCode,
      pixQrcodeBase64: normalizeQrCodeBase64(pix.brCodeBase64),
      status: normalizeStatus(pix.status),
      raw: pix,
    };
  }

  async checkStatus(gatewayTxId: string): Promise<PixPaymentStatus | null> {
    const status = await this.client.pix.status(gatewayTxId);
    return normalizeStatus(status.status);
  }

  async simulatePayment(gatewayTxId: string): Promise<void> {
    // A API aceita valores planos no metadata; o tipo Record<string, object>
    // do SDK é mais restritivo que a API real.
    await this.client.pix.simulate(gatewayTxId, {
      gatewayTxId,
      source: "1realpelobrasil",
    } as unknown as Record<string, object>);
  }
}

export class MockPixPaymentClient implements PixPaymentClient {
  readonly provider = "mock" as const;

  async createPix(input: CreatePixPaymentInput): Promise<PixPayment> {
    const pix = await buildMockPixPayload(input.amountCents);
    return {
      provider: this.provider,
      gatewayTxId: pix.gatewayTxId,
      pixCopiaCola: pix.pixCopiaCola,
      pixQrcodeBase64: pix.pixQrcodeBase64,
      status: "pending",
      raw: pix,
    };
  }

  async checkStatus(): Promise<PixPaymentStatus | null> {
    return null;
  }

  async simulatePayment(): Promise<void> {
    return undefined;
  }
}

export function getPixPaymentProvider(): PixPaymentProvider {
  const configured = readOptionalEnv("PIX_GATEWAY")?.toLowerCase();
  if (configured === "mock" || configured === "abacatepay") return configured;
  if (configured) {
    throw new Error("PIX_GATEWAY deve ser 'mock' ou 'abacatepay'.");
  }
  return readOptionalEnv("ABACATEPAY_API_KEY") ? "abacatepay" : "mock";
}

export function createPixPaymentClient(
  provider = getPixPaymentProvider()
): PixPaymentClient {
  switch (provider) {
    case "abacatepay":
      return new AbacatePayPixPaymentClient();
    case "mock":
      return new MockPixPaymentClient();
  }
}

export function isPaidPixStatus(status: PixPaymentStatus | null): boolean {
  return status === "paid";
}
