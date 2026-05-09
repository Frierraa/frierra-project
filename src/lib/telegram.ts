type TelegramSendMessageResponse = {
  ok: boolean;
  description?: string;
};

function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_NOT_CONFIGURED");
  return token;
}

export function getTelegramBotUsername(): string {
  const u = process.env.TELEGRAM_BOT_USERNAME;
  if (!u) throw new Error("TELEGRAM_BOT_USERNAME_NOT_SET");
  return u.replace(/^@/, "");
}

export async function sendTelegramMessageToChat(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) throw new Error("TELEGRAM_NOT_CONFIGURED");

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
  } catch {
    throw new Error("TELEGRAM_FETCH_FAILED");
  }
  const data = (await res.json().catch(() => null)) as TelegramSendMessageResponse | null;
  if (!res.ok || !data?.ok) {
    throw new Error(`TELEGRAM_SEND_FAILED:${data?.description ?? String(res.status)}`);
  }
}

export async function sendTelegramMessage(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error("TELEGRAM_NOT_CONFIGURED");
  await sendTelegramMessageToChat(chatId, text);
}

export async function sendTelegramAdminMessage(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error("TELEGRAM_NOT_CONFIGURED");
  await sendTelegramMessageToChat(chatId, text);
}

export async function telegramApi(method: string, payload: unknown): Promise<any> {
  const token = botToken();
  const url = `https://api.telegram.org/bot${token}/${method}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("TELEGRAM_FETCH_FAILED");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(`TELEGRAM_API_FAILED:${data?.description ?? String(res.status)}`);
  return data;
}

