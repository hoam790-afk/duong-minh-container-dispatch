"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Chrome, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@duongminhlogistics.vn");
  const [password, setPassword] = useState("admin123@");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, password, callbackUrl: "/" });
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-4 text-slate-900">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-lg bg-white shadow-soft md:grid-cols-[1fr_440px]">
        <section className="relative hidden bg-brand-navy p-10 text-white md:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.14),transparent_28%),linear-gradient(135deg,#0B2F63,#1555A6)]" />
          <div className="relative flex h-full flex-col justify-between">
            <Image src="/logo.jpg" alt="Dương Minh Logistics" width={170} height={170} className="rounded-md object-cover" priority />
            <div>
              <h1 className="max-w-lg text-4xl font-semibold leading-tight">Hệ thống chọn xe container bằng AI</h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-blue-100">
                Nhập booking, báo giá xe ngoài, thống kê sản lượng và chọn xe nhà hoặc xe ngoài theo dữ liệu thật trong database.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {["Xe nhà trước", "Chống trùng", "OpenRouter"].map((item) => (
                <div key={item} className="rounded-md border border-white/15 bg-white/10 p-3">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="flex items-center justify-center p-6">
          <form onSubmit={submit} className="w-full max-w-sm">
            <Image src="/logo.jpg" alt="Dương Minh Logistics" width={92} height={92} className="mb-7 rounded-md object-cover md:hidden" priority />
            <h2 className="text-2xl font-semibold">Đăng nhập</h2>
            <p className="mt-2 text-sm text-slate-500">Tài khoản admin mặc định đã được điền sẵn.</p>
            <label className="mt-7 block text-sm font-medium text-slate-700">Email</label>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 px-3">
              <Mail size={18} className="text-slate-400" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 flex-1 outline-none" />
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700">Password</label>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-200 px-3">
              <Lock size={18} className="text-slate-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 flex-1 outline-none" />
            </div>
            <button disabled={loading} className="mt-6 h-11 w-full rounded-md bg-brand-blue text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-60">
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
            <button type="button" onClick={() => signIn("google", { callbackUrl: "/" })} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Chrome size={18} />
              Google login
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
