"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlobTopLeft, BlobTopRight, DotPattern } from "@/components/landing/decorations";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Ошибка регистрации");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4">
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

        <div className="rounded-3xl border border-emerald-100 bg-white/90 p-8 shadow-xl shadow-emerald-100/50 backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800">Создать аккаунт</h1>
            <p className="mt-2 text-sm text-slate-500">
              Начните готовиться к экзаменам с умным расписанием
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              id="name"
              label="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
              minLength={6}
              required
            />
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" variant="green" className="w-full" disabled={loading}>
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
