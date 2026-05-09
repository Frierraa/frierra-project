import crypto from "node:crypto";

type YooKassaCredentials = {
  shopId: string;
  secretKey: string;
};

function getYooKassaCredentials(): YooKassaCredentials {
  const shopId = (process.env.YOOKASSA_SHOP_ID || "").trim();
  const secretKey = (process.env.YOOKASSA_SECRET_KEY || process.env.YOOKASSA_API_KEY || "").trim();
  if (!shopId || !secretKey) {
    throw new Error("YOOKASSA_NOT_CONFIGURED");
  }
  return { shopId, secretKey };
}

function authHeader({ shopId, secretKey }: YooKassaCredentials): string {
  const token = Buffer.from(`${shopId}:${secretKey}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export type YooKassaCreatePaymentArgs = {
  amountRub: number;
  returnUrl: string;
  description: string;
  metadata: Record<string, string>;
};

export type YooKassaCreatePaymentResult = {
  payment: any;
  confirmationUrl: string;
};

export async function yookassaCreatePayment(args: YooKassaCreatePaymentArgs): Promise<YooKassaCreatePaymentResult> {
  const creds = getYooKassaCredentials();
  const idempotenceKey = crypto.randomUUID();

  const payload = {
    amount: { value: (Math.max(0, args.amountRub) / 100).toFixed(2), currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: args.returnUrl },
    description: args.description,
    metadata: args.metadata,
  };

  const res = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      authorization: authHeader(creds),
      "content-type": "application/json",
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok || !data?.id) {
    const err = typeof data?.description === "string" ? data.description : "YOOKASSA_CREATE_FAILED";
    throw new Error(err);
  }
  const confirmationUrl = data?.confirmation?.confirmation_url;
  if (!confirmationUrl) throw new Error("YOOKASSA_NO_CONFIRMATION_URL");
  return { payment: data, confirmationUrl };
}

export async function yookassaGetPayment(externalPaymentId: string): Promise<any> {
  const creds = getYooKassaCredentials();
  const id = String(externalPaymentId || "").trim();
  if (!id) throw new Error("INVALID_PAYMENT_ID");

  const res = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { authorization: authHeader(creds) },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok || !data?.id) throw new Error("YOOKASSA_GET_FAILED");
  return data;
}

