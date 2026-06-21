"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { BookOpen, Calendar, LayoutDashboard, LogOut, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const navItems = [
  { href: "/dashboard", label: "Кабинет", icon: LayoutDashboard },
  { href: "/schedule", label: "Расписание", icon: Calendar },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 text-white shadow-md shadow-sky-200">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="hidden sm:inline">ExamPrep</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                pathname.startsWith(href)
                  ? "bg-gradient-to-r from-sky-50 to-emerald-50 text-sky-700 shadow-sm"
                  : "text-slate-500 hover:bg-sky-50 hover:text-sky-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl bg-sky-50 px-3 py-1.5 text-sm text-slate-600 sm:flex">
            <User className="h-4 w-4 text-sky-500" />
            {session.user?.name ?? session.user?.email}
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export function PublicHeader() {
  return (
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Link href="/" className="flex items-center gap-2.5 font-bold text-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-white shadow-lg shadow-sky-200/60">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="text-xl">ExamPrep</span>
      </Link>
      <div className="flex gap-3">
        <Link href="/login">
          <Button variant="ghost">Войти</Button>
        </Link>
        <Link href="/register">
          <Button>Регистрация</Button>
        </Link>
      </div>
    </header>
  );
}
