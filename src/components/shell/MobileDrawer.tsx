"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { OVERVIEW_ITEM, ACTION_ITEMS, WELLNESS_ITEMS, PROFILE_ITEM } from "./navItems";
import { TogetherfitLogo } from "@/components/brand/TogetherfitLogo";

const DRAWER_ID = "mobile-nav-drawer";

function DrawerLink({
  href,
  icon,
  label,
  active,
  onNavigate,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-accent/15 text-accent-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
      )}
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}

export function MobileDrawer({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Lock body scroll, move focus in, restore focus to the hamburger on close.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    drawerRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        id={DRAWER_ID}
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-surface px-3 py-6 outline-none"
      >
        <div className="mb-8 flex items-center gap-2 px-3">
          <TogetherfitLogo layout="inline" size={40} />
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <DrawerLink
            href={OVERVIEW_ITEM.href}
            icon={OVERVIEW_ITEM.icon}
            label={OVERVIEW_ITEM.label}
            active={pathname === "/"}
            onNavigate={onClose}
          />

          <div className="my-2 border-t border-border" />

          {ACTION_ITEMS.map((item) => (
            <DrawerLink
              key={item.key}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname.startsWith(item.href)}
              onNavigate={onClose}
            />
          ))}

          <div className="my-2 border-t border-border" />

          {WELLNESS_ITEMS.map((item) => (
            <DrawerLink
              key={item.key}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname.startsWith(item.href)}
              onNavigate={onClose}
            />
          ))}
        </nav>

        <div className="border-t border-border pt-3">
          <DrawerLink
            href={PROFILE_ITEM.href}
            icon={PROFILE_ITEM.icon}
            label={PROFILE_ITEM.label}
            active={pathname.startsWith(PROFILE_ITEM.href)}
            onNavigate={onClose}
          />
        </div>
      </div>
    </div>
  );
}

export { DRAWER_ID };
