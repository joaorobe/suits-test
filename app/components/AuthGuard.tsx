"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const PROTECTED_PREFIXES = ["/dashboard", "/inventory", "/costureira", "/devolucao", "/pagamentos"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (!isProtected) return;

    const hasAuthCookie = document.cookie
      .split(";")
      .map((item) => item.trim())
      .some((item) => item.startsWith("suits-auth-user="));
    const hasStoredUser = Boolean(window.localStorage.getItem("suits-auth-user"));

    if (!hasAuthCookie && !hasStoredUser) {
      const redirectTo = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(redirectTo);
    }
  }, [pathname, router]);

  return <>{children}</>;
}
