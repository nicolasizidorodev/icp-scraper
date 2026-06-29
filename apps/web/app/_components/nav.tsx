"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Campanhas", match: ["/", "/campaigns"] },
  { href: "/crm", label: "CRM", match: ["/crm"] },
  { href: "/settings", label: "Chaves de API", match: ["/settings"] },
];

function isActive(pathname: string, match: string[]): boolean {
  return match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
}

export function Nav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="flex items-center gap-6 border-b border-neutral-800 px-6 py-4">
      <Link href="/" className="font-bold">
        ICP Prospector
      </Link>
      <div className="flex gap-1 text-sm">
        {links.map((l) => {
          const active = isActive(pathname, l.match);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                active
                  ? "bg-neutral-800 font-medium text-neutral-100"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
