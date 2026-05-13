"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@test.ru");
  const [password, setPassword] = useState("111111");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Вход в административную панель</h1>
      <div className="mt-6 grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-extrabold text-zinc-900">Логин</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-extrabold text-zinc-900">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
          />
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, password }),
              });
              const data = (await res.json().catch(() => null)) as any;
              if (!res.ok || !data?.ok) throw new Error(data?.error || "LOGIN_FAILED");
              router.replace("/control");
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "LOGIN_FAILED");
            } finally {
              setLoading(false);
            }
          }}
          className="mt-2 inline-flex h-12 items-center justify-center rounded-2xl bg-black px-6 text-sm font-extrabold text-white enabled:hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Входим..." : "Войти"}
        </button>
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div> : null}
      </div>
    </div>
  );
}

