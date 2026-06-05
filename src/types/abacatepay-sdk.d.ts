declare module "@abacatepay/sdk" {
  export type AbacatePayCheckoutItem = {
    id: string;
    amount: number;
    quantity?: number;
  };

  export type AbacatePayCheckoutResponseItem = {
    id: string;
    quantity: number;
  };

  export type AbacatePayCheckoutCustomer = {
    name: string;
    email: string;
    taxId: string;
    cellphone: string;
  };

  export type AbacatePayCheckoutBody = {
    methods?: "PIX" | "CARD";
    returnUrl?: string;
    completionUrl?: string;
    customerId?: string;
    customer?: AbacatePayCheckoutCustomer;
    coupons?: string[];
    externalId?: string;
    metadata?: Record<string, object>;
    items: AbacatePayCheckoutItem[];
  };

  export type AbacatePayCheckout = {
    id: string;
    amount: number;
    paidAmount: number | null;
    externalId: string | null;
    url: string;
    items: AbacatePayCheckoutResponseItem[];
    status: "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";
    devMode: boolean;
    metadata?: Record<string, object>;
    returnUrl: string;
    completionUrl: string;
    receiptUrl: string | null;
    coupons: string[];
    customerId: string | null;
    createdAt: string;
    updatedAt: string;
  };

  export type AbacatePayPixBody = {
    amount: number;
    expiresIn?: number;
    description?: string;
    customer?: AbacatePayCheckoutCustomer;
    metadata?: Record<string, object>;
  };

  export type AbacatePayPix = {
    id: string;
    amount: number;
    status: "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";
    devMode: boolean;
    brCode: string;
    brCodeBase64: string;
    platformFee: number;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
  };

  export type AbacatePayPixStatus = {
    expiresAt: string;
    status: "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";
  };

  export type AbacatePayClient = {
    checkouts: {
      create(body: AbacatePayCheckoutBody): Promise<AbacatePayCheckout>;
    };
    pix: {
      create(body: AbacatePayPixBody): Promise<AbacatePayPix>;
      status(id: string): Promise<AbacatePayPixStatus>;
      simulate(
        id: string,
        metadata?: Record<string, object>
      ): Promise<AbacatePayPix>;
    };
  };

  export function AbacatePay(options: { secret: string }): AbacatePayClient;
}
