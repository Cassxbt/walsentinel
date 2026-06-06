"use client";

import { Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/#demo", label: "Demo", route: "/" },
  { href: "/monitor", label: "Monitor", route: "/monitor" },
  { href: "/#agent", label: "API handoff", route: null }
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Primary navigation">
      <Link className="brand-mark" href="/" aria-label="Walrus Sentinel home">
        <span>WS</span>
        <strong>Walrus Sentinel</strong>
      </Link>
      <div className="nav-status" aria-label="Runtime status">
        <Activity size={15} />
        pre-flight online
      </div>
      <div className="nav-links">
        {navItems.map((item) => {
          const active = item.route !== null && pathname === item.route;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
              {item.label}
            </Link>
          );
        })}
        <a href="/api/health" target="_blank" rel="noreferrer">
          Health
          <ArrowUpRight size={13} />
        </a>
      </div>
    </nav>
  );
}
