import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage(): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-subtle p-6">
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

function LoginSkeleton(): React.ReactElement {
  return (
    <div className="w-full max-w-sm rounded-lg border border-surface-muted bg-surface p-8 shadow-card">
      <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
      <div className="mt-2 h-3 w-32 animate-pulse rounded bg-surface-muted" />
      <div className="mt-6 space-y-4">
        <div className="h-9 w-full animate-pulse rounded bg-surface-muted" />
        <div className="h-9 w-full animate-pulse rounded bg-surface-muted" />
        <div className="h-9 w-full animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  );
}
