"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", short: "Stats" },
  { href: "/campaigns", label: "Campaigns", short: "Games" },
  { href: "/log", label: "Log a session", short: "Log" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-xs sm:text-sm overflow-x-auto">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="nav-link relative"
          data-active={pathname === link.href || pathname.startsWith(link.href + "/")}
        >
          <span className="sm:hidden">{link.short}</span>
          <span className="hidden sm:inline">{link.label}</span>
        </Link>
      ))}
    </nav>
  );
}
