"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlobTopLeft, BlobTopRight, DotPattern } from "@/components/landing/decorations";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Неверный email или пароль");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-4">
      <DotPattern />
      <BlobTopLeft />
      <BlobTopRight />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-white shadow-lg shadow-sky-200">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-xl">ExamPrep</span>
          </Link>
        </div>

        <div className="rounded-3xl border border-sky-100 bg-white/90 p-8 shadow-xl shadow-sky-100/50 backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800">Добро пожаловать!</h1>
            <p className="mt-2 text-sm text-slate-500">Войдите, чтобы продолжить подготовку</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Нет аккаунта?{" "}
            <Link href="/register" className="font-semibold text-sky-600 hover:text-sky-700">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
