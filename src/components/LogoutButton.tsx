"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  className?: string;
  redirectTo?: string;
  label?: string;
  loadingLabel?: string;
};

export function LogoutButton({
  className,
  redirectTo = "/",
  label = "Выйти",
  loadingLabel = "Выходим…",
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace(redirectTo);
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
      className={
        className ||
        "inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

