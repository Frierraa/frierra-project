"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { formatRuPhonePlus7, isValidRuLocal10, normalizeRuLocal10 } from "@/lib/phone";

type Step = "phone" | "code";

export function AuthClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirectTo = sp.get("redirect") || "/orders";

  const [step, setStep] = useState<Step>("phone");
  const [name, setName] = useState("");
  const [phoneLocal10, setPhoneLocal10] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botLink, setBotLink] = useState<string | null>(null);

  const phoneNormalized = useMemo(() => formatRuPhonePlus7(phoneLocal10), [phoneLocal10]);
  const phoneOk = useMemo(() => isValidRuLocal10(phoneLocal10), [phoneLocal10]);

  async function requestCode() {
    setLoading(true);
    setError(null);
    setBotLink(null);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: phoneNormalized }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) {
        if (data?.error === "TELEGRAM_NOT_LINKED" && typeof data?.botLink === "string") {
          setBotLink(data.botLink);
          throw new Error("TELEGRAM_NOT_LINKED");
        }
        throw new Error(data?.error || "REQUEST_FAILED");
      }
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "REQUEST_FAILED");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: phoneNormalized, code, name }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "VERIFY_FAILED");
      }
      router.replace(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "VERIFY_FAILED");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-lg gap-6">
      <div className="rounded-2xl bg-zinc-900 px-5 py-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Вход по телефону</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Код придёт в Telegram-бот. После входа откроется история заказов.
        </p>
      </div>

      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-extrabold text-zinc-900">Имя (необязательно)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван"
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-extrabold text-zinc-900">Телефон</span>
            <div className="flex items-center gap-2">
              <div className="h-11 rounded-xl border border-black/10 bg-zinc-50 px-3 text-sm font-extrabold text-zinc-900 flex items-center">
                +7
              </div>
              <input
                value={normalizeRuLocal10(phoneLocal10)}
                onChange={(e) => setPhoneLocal10(normalizeRuLocal10(e.target.value))}
                placeholder="9991234567"
                inputMode="numeric"
                autoComplete="tel-national"
                pattern="[0-9]*"
                maxLength={10}
                className="h-11 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
              />
            </div>
            <div className="text-xs font-semibold text-zinc-600">
              Введите <span className="font-extrabold text-zinc-900">10 цифр</span>. Будет сохранён как:{" "}
              <span className="font-extrabold text-zinc-900">{phoneOk ? phoneNormalized : "—"}</span>
            </div>
          </label>

          {step === "code" ? (
            <label className="grid gap-2">
              <span className="text-sm font-extrabold text-zinc-900">Код из Telegram</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
              />
            </label>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
              Ошибка:{" "}
              {error === "TELEGRAM_NOT_LINKED"
                ? "Telegram ещё не привязан к этому телефону. Открой бота по ссылке ниже и нажми Start, затем снова нажми “Получить код”."
                : error === "TELEGRAM_NOT_CONFIGURED"
                  ? "Не настроен Telegram (проверь TELEGRAM_BOT_TOKEN и TELEGRAM_BOT_USERNAME в .env)"
                : error === "TELEGRAM_FETCH_FAILED"
                  ? "Не удалось подключиться к Telegram API (проверь интернет/фаервол)"
                  : error.startsWith("TELEGRAM_SEND_FAILED:")
                    ? `Telegram вернул ошибку: ${error.replace("TELEGRAM_SEND_FAILED:", "")}`
                    : error}
            </div>
          ) : null}

          {botLink ? (
            <a
              href={botLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#229ED9] px-6 text-sm font-extrabold text-white hover:bg-[#229ED9]/90"
            >
              Открыть Telegram‑бота и нажать Start
            </a>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            {step === "phone" ? (
              <button
                type="button"
                disabled={loading || !phoneOk}
                onClick={requestCode}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-black px-6 text-sm font-extrabold text-white enabled:hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Получить код
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || code.trim().length < 4}
                onClick={verifyCode}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-black px-6 text-sm font-extrabold text-white enabled:hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Войти
              </button>
            )}

            {step === "code" ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setStep("phone");
                  setCode("");
                }}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-black/10 bg-white px-6 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Назад
              </button>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}

