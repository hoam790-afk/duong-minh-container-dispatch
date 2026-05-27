"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
  LogOut,
  MessageSquareText,
  Save,
  Send,
  Truck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarkdownBlock } from "@/components/MarkdownBlock";
import { formatVnd } from "@/lib/utils";

type ChatMessage = { role: "user" | "ai"; text: string };
type AppView = "booking" | "assign" | "stats";
type NavItem = [AppView, LucideIcon, string];
type KpiItem = [string, number, LucideIcon];
type CustomerStat = { name: string; export: number; import: number; total: number };
type DashboardData = {
  kpis: Record<string, number>;
  dailyCustomers?: CustomerStat[];
  monthlyCustomers?: CustomerStat[];
  assignments: Array<Record<string, any>>;
};

const examples = [
  "Hàng xuất khách FUYUAN, booking 267772977, 2 cont, bãi lấy rỗng NAM KHÁNH, hạ CÁT LÁI, hãng tàu MAERSK.",
  "Nhà xe Minh Phát báo giá Cát Lái đi Long An cont 40 là 4.400.000 VND, hiệu lực từ 26/05/2026.",
  "Chọn xe cho booking 267772977.",
  "Tạo báo cáo booking hôm nay.",
  "Thống kê theo tên công ty trong tháng này."
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const [activeView, setActiveView] = useState<AppView>("booking");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: "Nhập booking hoặc báo giá xe ngoài. Khi cần chọn xe, gõ: Chọn xe cho booking ... Kết quả sẽ được lưu lại để thống kê theo ngày và tháng."
    }
  ]);
  const [input, setInput] = useState(examples[0]);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [customPrompt, setCustomPrompt] = useState(
    "Bạn là AI điều phối xe container của Dương Minh Logistics. Phân tích đúng dữ liệu người dùng gửi, không tự bịa giá/nhà xe/booking. Nếu đủ dữ liệu thì lưu booking hoặc chọn xe theo database. Nếu thiếu dữ liệu thì báo CHƯA ĐỦ DỮ LIỆU."
  );
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statRange, setStatRange] = useState<"day" | "month">("day");

  useEffect(() => {
    if (status === "unauthenticated") location.href = "/login";
  }, [status]);

  async function refresh() {
    const [settingsRes, dashboardRes] = await Promise.all([fetch("/api/chat"), fetch("/api/dashboard")]);
    if (settingsRes.ok) {
      const settings = await settingsRes.json();
      setModels(settings.enabledModels || []);
      setModel((current) => current || settings.defaultModel);
    }
    if (dashboardRes.ok) setDashboard(await dashboardRes.json());
  }

  useEffect(() => {
    if (status === "authenticated") refresh();
  }, [status]);

  async function send(message = input) {
    if (!message.trim() || loading) return;
    setInput("");
    setMessages((items) => [...items, { role: "user", text: message }]);
    setLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, model, customPrompt })
    });
    const data = await res.json();
    setMessages((items) => [...items, { role: "ai", text: data.response || data.error || "Có lỗi khi xử lý." }]);
    setLoading(false);
    await refresh();
  }

  if (status === "loading" || !session) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Đang tải hệ thống...</div>;
  }

  const k = dashboard?.kpis || {};
  const stats = statRange === "day" ? dashboard?.dailyCustomers || [] : dashboard?.monthlyCustomers || [];
  const navItems: NavItem[] = [
    ["booking", FileSpreadsheet, "Booking"],
    ["assign", Truck, "Chọn xe"],
    ["stats", BarChart3, "Thống kê"]
  ];
  const kpiItems: KpiItem[] = [
    ["Hôm nay", k.todayTotal || 0, CalendarDays],
    ["Tháng này", k.monthTotal || 0, BarChart3],
    ["Xe nhà", k.internalUses || 0, Truck],
    ["Xe ngoài", k.externalUses || 0, Truck]
  ];

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
          <div className="flex items-center gap-3 rounded-md bg-brand-red p-3 text-white">
            <Image src="/logo.jpg" alt="Dương Minh Logistics" width={48} height={48} className="rounded object-cover" priority />
            <div>
              <p className="text-sm font-semibold">Dương Minh</p>
              <p className="text-xs text-red-50">Chọn xe container</p>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map(([id, Icon, label]) => (
              <button
                key={String(id)}
                onClick={() => setActiveView(id)}
                className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium ${
                  activeView === id ? "bg-brand-sky text-brand-blue" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={18} />
                {String(label)}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-md border border-slate-200 p-3 text-sm">
            <p className="font-semibold">{session.user.name || session.user.email}</p>
            <p className="mt-1 text-xs uppercase text-slate-500">{session.user.role}</p>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-slate-100 hover:bg-slate-200">
              <LogOut size={16} />
              Đăng xuất
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-brand-navy">{"AI ch\u1ecdn xe container"}</h1>
                <p className="text-sm text-slate-500">Nhập dữ liệu, gửi AI xử lý, lưu kết quả và xem thống kê ngày/tháng.</p>
              </div>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none">
                {models.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </header>

          <div className="grid min-w-0 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
              <div className="border-b border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
                  <MessageSquareText size={18} />
                  Gửi thông tin cho AI
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-brand-navy">Prompt xử lý AI</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="min-h-24 w-full resize-y rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-brand-blue"
                    placeholder="Nhập yêu cầu xử lý riêng cho AI..."
                  />
                </div>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="min-h-36 w-full resize-y rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-brand-blue"
                  placeholder="Ví dụ: Hàng xuất khách FUYUAN, booking 267772977, 2 cont, bãi lấy rỗng NAM KHÁNH, hạ CÁT LÁI, hãng tàu MAERSK."
                />

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => send()} disabled={loading} className="flex h-10 items-center gap-2 rounded-md bg-brand-blue px-4 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-60">
                    <Send size={16} />
                    Gửi AI xử lý & lưu
                  </button>
                  <button onClick={() => send("Chọn xe cho booking " + (input.match(/booking\s+([A-Z0-9-]+)/i)?.[1] || ""))} disabled={loading} className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Truck size={16} />
                    AI chọn xe
                  </button>
                  <button onClick={() => send("Tạo báo cáo booking hôm nay.")} disabled={loading} className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Save size={16} />
                    Kích xuất & lưu báo cáo
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {examples.map((item) => (
                    <button key={item} onClick={() => setInput(item)} className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 hover:bg-brand-sky hover:text-brand-blue">
                      {item.slice(0, 42)}...
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 p-4">
                <p className="mb-3 text-sm font-semibold text-brand-navy">Kết quả AI</p>
                <div className="max-h-[520px] space-y-3 overflow-y-auto">
                  {messages.map((message, idx) => (
                    <div key={idx} className={`rounded-md px-4 py-3 ${message.role === "user" ? "ml-10 bg-brand-blue text-white" : "mr-10 border border-slate-200 bg-slate-50"}`}>
                      {message.role === "ai" ? <MarkdownBlock text={message.text} /> : <p className="text-sm leading-6">{message.text}</p>}
                    </div>
                  ))}
                  {loading && <div className="text-sm text-slate-500">AI đang xử lý và lưu database...</div>}
                </div>
              </div>
            </section>

            <aside className="min-w-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {kpiItems.map(([label, value, Icon]) => (
                  <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-3 shadow-soft">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{String(label)}</span>
                      <Icon size={15} />
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-brand-navy">{String(value)}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-brand-navy">Thống kê</h2>
                  <div className="flex rounded-md bg-slate-100 p-1 text-xs">
                    <button onClick={() => setStatRange("day")} className={`rounded px-2 py-1 ${statRange === "day" ? "bg-white text-brand-blue shadow-sm" : "text-slate-500"}`}>
                      Ngày
                    </button>
                    <button onClick={() => setStatRange("month")} className={`rounded px-2 py-1 ${statRange === "month" ? "bg-white text-brand-blue shadow-sm" : "text-slate-500"}`}>
                      Tháng
                    </button>
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-2">Khách</th>
                        <th className="py-2 text-right">Xuất</th>
                        <th className="py-2 text-right">Nhập</th>
                        <th className="py-2 text-right">Tổng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((row) => (
                        <tr key={row.name} className="border-t border-slate-100">
                          <td className="py-2 font-medium">{row.name}</td>
                          <td className="py-2 text-right">{row.export}</td>
                          <td className="py-2 text-right">{row.import}</td>
                          <td className="py-2 text-right font-semibold">{row.total}</td>
                        </tr>
                      ))}
                      {!stats.length && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">Chưa có dữ liệu.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex justify-between"><span>Chi phí xe ngoài</span><strong>{formatVnd(k.externalCost)}</strong></div>
                  <div className="mt-2 flex justify-between"><span>Cơ hội tái sử dụng</span><strong>{k.reuseCount || 0}</strong></div>
                </div>
              </div>
            </aside>
          </div>

          <section className="mx-4 mb-4 min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-brand-navy">Kết quả chọn xe đã lưu</h2>
            </div>
            <div className="table-scroll overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {["Ngày", "Khách", "Booking/File", "Cont", "Tuyến", "Xe chọn", "Loại", "Nhà xe", "Giá", "Lý do"].map((head) => (
                      <th key={head} className="border-b border-slate-200 px-3 py-2 font-semibold">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(dashboard?.assignments || []).map((a, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-slate-50/70">
                      <td className="border-b border-slate-100 px-3 py-2">{new Date(a.assignedAt).toLocaleDateString("vi-VN")}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{a.booking?.customerName}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{a.booking?.fileNo || a.booking?.bookingNo}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right">{a.booking?.containerCount}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{a.booking?.pickupLocation} - {a.booking?.deliveryLocation}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{a.internalTruck?.truckNo || a.externalVendor?.vendorName}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{a.selectedType === "internal" ? "Xe nhà" : "Xe ngoài"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{a.externalVendor?.vendorName || "Dương Minh"}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right">{a.selectedPrice ? formatVnd(a.selectedPrice) : "0 VND"}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{a.reason}</td>
                    </tr>
                  ))}
                  {!dashboard?.assignments?.length && (
                    <tr>
                      <td className="px-3 py-5 text-center text-slate-500" colSpan={10}>Chưa có kết quả chọn xe đã lưu.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
