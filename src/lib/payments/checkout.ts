import { AbacatePay } from "@abacatepay/sdk";

export type CheckoutPaymentProvider = "abacatepay";
export type CheckoutPaymentStatus =
  | "pending"
  | "paid"
  | "expired"
  | "cancelled"
  | "refunded"
  | "unknown";

export type CheckoutPaymentMethod = "PIX" | "CARD";

export type CheckoutPaymentItem = {
  id: string;
  amountCents: number;
  quantity?: number;
};

export type CheckoutPaymentCustomer = {
  name: string;
  email: string;
  taxId: string;
  cellphone: string;
};

export type CreateCheckoutPaymentInput = {
  items: CheckoutPaymentItem[];
  methods?: CheckoutPaymentMethod;
  returnUrl?: string;
  completionUrl?: string;
  customerId?: string;
  customer?: CheckoutPaymentCustomer;
  coupons?: string[];
  externalId?: string;
  metadata?: Record<string, unknown>;
};

export type CheckoutPayment = {
  provider: CheckoutPaymentProvider;
  id: string;
  url: string;
  amountCents: number;
  status: CheckoutPaymentStatus;
  externalId: string | null;
  raw: unknown;
};

export interface CheckoutPaymentClient {
  readonly provider: CheckoutPaymentProvider;
  createCheckout(input: CreateCheckoutPaymentInput): Promise<CheckoutPayment>;
}

type AbacatePayClient = ReturnType<typeof AbacatePay>;
type AbacatePayCheckoutBody = Parameters<
  AbacatePayClient["checkouts"]["create"]
>[0];

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getAbacatePayApiKey(): string {
  const apiKey = readOptionalEnv("ABACATEPAY_API_KEY");
  if (!apiKey) {
    throw new Error("ABACATEPAY_API_KEY não está definida.");
  }
  return apiKey;
}

function asMetadataObject(value: unknown): object {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return { value };
}

function normalizeMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, object> | undefined {
  if (!metadata) return undefined;
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      asMetadataObject(value),
    ])
  );
}

function normalizeCheckoutStatus(status: string | null): CheckoutPaymentStatus {
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

export class AbacatePayCheckoutPaymentClient implements CheckoutPaymentClient {
  readonly provider = "abacatepay" as const;

  constructor(private readonly client: AbacatePayClient = createAbacatePayClient()) {}

  async createCheckout(
    input: CreateCheckoutPaymentInput
  ): Promise<CheckoutPayment> {
    const body: AbacatePayCheckoutBody = {
      items: input.items.map((item) => ({
        id: item.id,
        amount: item.amountCents,
        quantity: item.quantity,
      })),
      methods: input.methods,
      returnUrl: input.returnUrl,
      completionUrl: input.completionUrl,
      customerId: input.customerId,
      customer: input.customer,
      coupons: input.coupons,
      externalId: input.externalId,
      metadata: normalizeMetadata(input.metadata),
    };

    const checkout = await this.client.checkouts.create(body);

    return {
      provider: this.provider,
      id: checkout.id,
      url: checkout.url,
      amountCents: checkout.amount,
      status: normalizeCheckoutStatus(checkout.status),
      externalId: checkout.externalId,
      raw: checkout,
    };
  }
}

export function getCheckoutPaymentProvider(): CheckoutPaymentProvider {
  const configured = readOptionalEnv("CHECKOUT_PAYMENT_PROVIDER")?.toLowerCase();
  if (!configured) return "abacatepay";
  if (configured === "abacatepay") return configured;
  throw new Error("CHECKOUT_PAYMENT_PROVIDER deve ser 'abacatepay'.");
}

export function createCheckoutPaymentClient(
  provider = getCheckoutPaymentProvider()
): CheckoutPaymentClient {
  switch (provider) {
    case "abacatepay":
      return new AbacatePayCheckoutPaymentClient();
  }
}
