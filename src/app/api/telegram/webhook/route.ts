import { NextRequest } from "next/server";
import { sendTelegramAdminMessage } from "@/lib/telegram";
import { processTelegramStartMessage } from "@/lib/telegramLinking";

export const runtime = "nodejs";

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; username?: string };
  };
};

function webhookSecretOk(req: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true; // для локалки можно не включать секрет
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  return got === expected;
}

export async function POST(req: NextRequest) {
  if (!webhookSecretOk(req)) return Response.json({ ok: false }, { status: 401 });

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const msg = update?.message;
  if (!msg) return Response.json({ ok: true });
  const linked = await processTelegramStartMessage(msg);
  if (linked && msg.chat?.id) {
    await sendTelegramAdminMessage(`✅ Telegram привязан: chatId ${msg.chat.id}`).catch(() => {});
  }

  return Response.json({ ok: true });
}

