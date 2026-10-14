import type { ReactNode } from "react";

// 200ms ease-out fade + slight rise on every route change (CSS, so it never blocks first paint).
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
