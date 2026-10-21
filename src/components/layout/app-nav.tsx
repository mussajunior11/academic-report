"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { ToastProvider } from "@/components/ui/toast";
import { buttonClasses } from "@/components/ui/button";
import { Spinner } from "@/components/ui/submit-button";
import { DEFAULT_SIDEBAR_THEME, hexToRgba, isDarkColor, type SidebarThemeValues } from "@/lib/utils/color";
import { logoutAction } from "@/app/login/actions";

type NavChild = { href: string; label: string };
type NavItem = { href: string; label: string; icon: React.ReactNode; children?: NavChild[] };

export type SessionUser = { name: string; email: string; role: string };

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5 shrink-0"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: <Icon path="M3 12l9-9 9 9M5 10v10h14V10" /> },
  {
    href: "/students",
    label: "Students",
    icon: <Icon path="M16 20v-2a4 4 0 0 0-8 0v2M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  },
  {
    href: "/examinations",
    label: "Exams",
    icon: (
      <Icon path="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 14l2 2 4-4" />
    ),
  },
  {
    href: "/marks-entry",
    label: "Marks Entry",
    icon: <Icon path="M4 4h16v16H4zM4 9h16M9 9v11M15 9v11" />,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: <Icon path="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 13h6M9 17h4" />,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <Icon path="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 2.2l.1.1A1.7 1.7 0 0 0 9 3h.1A1.7 1.7 0 0 0 10.6 1.4V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 16 3a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 9v.1" />
    ),
    children: [
      { href: "/classes", label: "Classes" },
      { href: "/subjects", label: "Subjects" },
      { href: "/settings/examinations", label: "Examination types" },
      { href: "/terms", label: "Terms" },
      { href: "/terms/quarters", label: "Quarter" },
      { href: "/grading", label: "Grading" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  user,
  systemLogoUrl,
  sidebarTheme,
  children,
}: {
  user: SessionUser;
  systemLogoUrl?: string | null;
  sidebarTheme?: SidebarThemeValues | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const theme = sidebarTheme ?? DEFAULT_SIDEBAR_THEME;
  const dark = isDarkColor(theme.color);
  const glassStyle = {
    backgroundColor: hexToRgba(theme.color, theme.opacity),
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  };
  const borderClass = dark ? "border-white/15" : "border-slate-200/70";
  const itemActive = dark ? "bg-white/15 text-white" : "bg-royal-soft text-royal";
  const itemIdle = dark
    ? "text-slate-100/80 hover:bg-white/10 hover:text-white"
    : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900";
  const titleClass = dark ? "text-white" : "text-slate-900";
  const subtitleClass = dark ? "text-slate-200/70" : "text-slate-500";
  const chevronClass = dark ? "text-slate-200/70 hover:text-white" : "text-slate-400 hover:text-slate-700";

  return (
    <ToastProvider>
    <div className="min-h-screen lg:flex">
      {/* Mobile top bar */}
      <header
        className={cn(
          "no-print sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md lg:hidden",
          borderClass,
          titleClass,
        )}
        style={glassStyle}
      >
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          {systemLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={systemLogoUrl} alt="System logo" className="h-8 w-auto max-w-[8rem] object-contain" />
          ) : (
            <BrandMark />
          )}
          <span className="text-sm font-semibold">Academic Report</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle navigation menu"
          className={cn("rounded-md p-2", dark ? "hover:bg-white/10" : "hover:bg-slate-900/5")}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "no-print z-20 w-full shrink-0 border-r backdrop-blur-md lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64",
          borderClass,
          open ? "block border-b" : "hidden",
        )}
        style={glassStyle}
      >
          <div className="hidden flex-col gap-2 px-4 py-5 lg:flex">
            {systemLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={systemLogoUrl}
                alt="System logo"
                className="h-12 w-auto max-w-full object-contain"
              />
            ) : (
              <BrandMark />
            )}
            <div>
              <p className={cn("text-sm font-semibold leading-tight", titleClass)}>Academic Report</p>
              <p className={cn("text-[11px]", subtitleClass)}>Inspiring every step of learning</p>
            </div>
          </div>
        <nav className="space-y-1 px-2 py-2 lg:py-0" aria-label="Main">
          {NAV.map((item) => {
            const childActive = item.children?.some((child) => isActive(pathname, child.href)) ?? false;
            const active = isActive(pathname, item.href) || childActive;

            if (!item.children?.length) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active ? itemActive : itemIdle,
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            }

            const expanded = openGroups[item.href] ?? childActive;
            return (
              <div key={item.href}>
                <div
                  className={cn(
                    "flex items-center rounded-md transition-colors",
                    active ? itemActive : itemIdle,
                  )}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active && !childActive ? "page" : undefined}
                    className="flex flex-1 items-center gap-3 px-3 py-2 text-sm font-medium"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [item.href]: !expanded }))}
                    aria-expanded={expanded}
                    aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                    className={cn("px-2 py-2", chevronClass)}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
                {expanded ? (
                  <div className="mt-1 space-y-1 pl-4">
                    {item.children.map((child) => {
                      const current = isActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          aria-current={current ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                            current ? itemActive : itemIdle,
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" aria-hidden="true" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className={cn("border-t px-4 py-4", borderClass)}>
          <p className={cn("truncate text-sm font-medium", subtitleClass)}>{user.name}</p>
          <p className={cn("truncate text-[11px]", subtitleClass)}>{user.email}</p>
          <p
            className={cn(
              "mt-2 inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              dark ? "bg-white/15 text-white" : "bg-slate-900/5 text-slate-600",
            )}
          >
            {user.role}
          </p>
          <LogoutButton onDone={() => setOpen(false)} />
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 bg-cream">
        <div className="app-main-inner mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
    </ToastProvider>
  );
}

function LogoutButton({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const logout = () => {
    startTransition(async () => {
      await logoutAction();
      onDone?.();
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className={buttonClasses("secondary", "sm", "mt-3 w-full")}
    >
      {pending ? <Spinner className="h-4 w-4" /> : null}
      Sign out
    </button>
  );
}

function BrandMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-royal text-sm font-bold text-white shadow-sm ring-1 ring-white/20">
      AR
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
