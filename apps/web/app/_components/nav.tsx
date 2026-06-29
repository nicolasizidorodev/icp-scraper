import Link from "next/link";

const links = [
  { href: "/", label: "Campanhas" },
  { href: "/crm", label: "CRM" },
  { href: "/settings", label: "Chaves de API" },
];

export function Nav() {
  return (
    <nav className="flex items-center gap-6 border-b border-neutral-800 px-6 py-4">
      <Link href="/" className="font-bold">
        ICP Prospector
      </Link>
      <div className="flex gap-4 text-sm text-neutral-400">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-neutral-100">
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
