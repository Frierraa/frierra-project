import { Suspense } from "react";
import { AuthClient } from "./AuthClient";

function AuthFallback() {
  return <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-zinc-600">Загрузка…</div>;
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthClient />
    </Suspense>
  );
}

