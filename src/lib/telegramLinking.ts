import { prisma } from "@/lib/prisma";
import { telegramApi } from "@/lib/telegram";

type TelegramMessageLike = {
  text?: string;
  chat?: { id?: number };
  from?: { username?: string };
};

let lastUpdateId: number | null = null;

async function consumeStartToken(token: string, chatId: string, username?: string): Promise<boolean> {
  const link = await prisma.telegramLinkRequest.findUnique({ where: { token } });
  if (!link || link.consumedAt) return false;
  if (link.expiresAt.getTime() < Date.now()) return false;

  await prisma.telegramLinkRequest.update({
    where: { token },
    data: { consumedAt: new Date() },
  });

  await prisma.telegramAccount.upsert({
    where: { phone: link.phone },
    update: { chatId, username: username || undefined },
    create: { phone: link.phone, chatId, username: username || null },
  });

  return true;
}

export async function processTelegramStartMessage(message: TelegramMessageLike): Promise<boolean> {
  const text = String(message.text || "");
  const chatId = message.chat?.id;
  if (!chatId) return false;

  const m = text.match(/^\/start\s+([A-Za-z0-9_-]{10,})/);
  if (!m) return false;

  return consumeStartToken(m[1], String(chatId), message.from?.username);
}

export async function syncTelegramLinksFromUpdates(): Promise<void> {
  const payload: Record<string, unknown> = {
    limit: 100,
    allowed_updates: ["message"],
  };
  if (lastUpdateId !== null) payload.offset = lastUpdateId + 1;

  const data = await telegramApi("getUpdates", payload);
  const updates = Array.isArray(data?.result) ? data.result : [];
  for (const u of updates) {
    if (typeof u?.update_id === "number") {
      lastUpdateId = lastUpdateId === null ? u.update_id : Math.max(lastUpdateId, u.update_id);
    }
    await processTelegramStartMessage((u?.message ?? {}) as TelegramMessageLike);
  }
}

