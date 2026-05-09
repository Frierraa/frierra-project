import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, hashOtpCode, isValidRuPhonePlus7, normalizePhone } from "@/lib/auth";
import crypto from "crypto";
import { getTelegramBotUsername, sendTelegramMessageToChat } from "@/lib/telegram";
import { syncTelegramLinksFromUpdates } from "@/lib/telegramLinking";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { phone?: string } | null;
    const phone = normalizePhone(body?.phone ?? "");
    if (!phone || !isValidRuPhonePlus7(phone)) {
      return Response.json({ ok: false, error: "INVALID_PHONE" }, { status: 400 });
    }

    // Fallback для локальной разработки без публичного webhook:
    // если пользователь уже нажал Start, подтянем update напрямую через getUpdates.
    await syncTelegramLinksFromUpdates().catch(() => {});

    const tg = await prisma.telegramAccount.findUnique({ where: { phone } });
    if (!tg) {
      const token = crypto.randomBytes(18).toString("base64url");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
      await prisma.telegramLinkRequest.create({ data: { phone, token, expiresAt } });
      const username = getTelegramBotUsername();
      const botLink = `https://t.me/${username}?start=${token}`;
      return Response.json({ ok: false, error: "TELEGRAM_NOT_LINKED", botLink }, { status: 409 });
    }

    const now = new Date();
    const since = new Date(Date.now() - 1000 * 30);
    const recent = await prisma.phoneOtp.count({
      where: { phone, createdAt: { gte: since } },
    });
    if (recent > 0) {
      return Response.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const code = generateOtpCode();
    const codeHash = hashOtpCode(phone, code);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 5);

    await prisma.phoneOtp.updateMany({
      where: { phone, consumedAt: null },
      data: { consumedAt: now },
    });

    await prisma.phoneOtp.create({
      data: { phone, codeHash, expiresAt },
    });

    await sendTelegramMessageToChat(
      tg.chatId,
      [
        "<b>BurgerSize OTP</b>",
        `Телефон: <code>${phone}</code>`,
        `Код: <b>${code}</b>`,
        `Действует до: ${expiresAt.toLocaleString("ru-RU")}`,
      ].join("\n"),
    );

    return Response.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    const msg = e instanceof Error ? e.message : "REQUEST_FAILED";
    const known =
      msg.startsWith("TELEGRAM_") || msg.startsWith("TELEGRAM_SEND_FAILED:") ? msg : "REQUEST_FAILED";
    return Response.json({ ok: false, error: known }, { status: 500 });
  }
}

