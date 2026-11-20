import type { ReactNode } from 'react';

export function Feedback({ busy, error }: { busy?: boolean; error?: string }) {
  return <>{busy && <p className="ws-loading" role="status">Working…</p>}{error && <p className="ws-error" role="alert">{error}</p>}</>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="ws-empty">{children}</p>;
}
