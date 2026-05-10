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
  if (!/^\d+$/.test(shopId)) {
    throw new Error("YOOKASSA_INVALID_SHOP_ID");
  }
  // Частая проблема: в env вставляют маску вида `test_*abc`, а не полный секрет.
  if (secretKey.includes("*")) {
    throw new Error("YOOKASSA_SECRET_KEY_MASKED");
  }
  return { shopId, secretKey };
}

function authHeader({ shopId, secretKey }: YooKassaCredentials): string {
  const token = Buffer.from(`${shopId}:${secretKey}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export type YooKassaCreatePaymentArgs = {
  /** Сумма в рублях (как `Order.totalRub` в БД). */
  amountRub: number;
  returnUrl: string;
  description: string;
  metadata: Record<string, string>;
};

/** Фрагмент ответа API ЮKassa (достаточно для сохранения и редиректа). */
export type YooKassaPaymentJson = {
  id?: string;
  status?: string;
  description?: string;
  code?: string;
  type?: string;
  parameter?: string;
  confirmation?: { confirmation_url?: string };
} & Record<string, unknown>;

export type YooKassaCreatePaymentResult = {
  payment: YooKassaPaymentJson;
  confirmationUrl: string;
};

function parsePaymentJson(raw: unknown): YooKassaPaymentJson | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as YooKassaPaymentJson;
}

export async function yookassaCreatePayment(args: YooKassaCreatePaymentArgs): Promise<YooKassaCreatePaymentResult> {
  const creds = getYooKassaCredentials();
  const idempotenceKey = crypto.randomUUID();

  const payload = {
    amount: { value: Math.max(0, Math.floor(args.amountRub)).toFixed(2), currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect", return_url: args.returnUrl },
    description: args.description,
    metadata: args.metadata,
  };

  const res = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      Authorization: authHeader(creds),
      Accept: "application/json",
      "content-type": "application/json",
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify(payload),
  });
  const data = parsePaymentJson(await res.json().catch(() => null));
  if (!res.ok || !data?.id) {
    const details = [data?.type, data?.code, data?.parameter, data?.description]
      .filter((x) => typeof x === "string" && x.trim().length > 0)
      .join(" | ");
    const err = details || `YOOKASSA_CREATE_FAILED_${res.status}`;
    throw new Error(err);
  }
  const confirmationUrl = data.confirmation?.confirmation_url;
  if (!confirmationUrl || typeof confirmationUrl !== "string") throw new Error("YOOKASSA_NO_CONFIRMATION_URL");
  return { payment: data, confirmationUrl };
}

export async function yookassaGetPayment(externalPaymentId: string): Promise<YooKassaPaymentJson> {
  const creds = getYooKassaCredentials();
  const id = String(externalPaymentId || "").trim();
  if (!id) throw new Error("INVALID_PAYMENT_ID");

  const res = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Authorization: authHeader(creds), Accept: "application/json" },
    cache: "no-store",
  });
  const data = parsePaymentJson(await res.json().catch(() => null));
  if (!res.ok || !data?.id) throw new Error("YOOKASSA_GET_FAILED");
  return data;
}

