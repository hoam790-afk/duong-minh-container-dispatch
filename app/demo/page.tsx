import Image from "next/image";
import { BarChart3, CalendarDays, FileSpreadsheet, MessageSquareText, Save, Send, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarkdownBlock } from "@/components/MarkdownBlock";

type DemoNavItem = [LucideIcon, string, boolean];
type DemoKpiItem = [string, number, LucideIcon];

const aiResult = `Đã lưu booking mới vào database cho khách FUYUAN.

AI chọn xe:

| Ngày | Khách | Booking/File | Cont | Tuyến | Xe chọn | Loại | Nhà xe | Giá | Lý do |
|---|---|---|---:|---|---|---|---|---:|---|
| 27/05/2026 | FUYUAN | 267772977 | 2 | NAM KHÁNH - CÁT LÁI | DM-01-01 | Xe nhà | Dương Minh | 0 VND | Ưu tiên xe nhà Đội 1 đang available. |

Kết quả đã được lưu để thống kê theo ngày và theo tháng.`;

export default function DemoPage() {
  const navItems: DemoNavItem[] = [
    [FileSpreadsheet, "Booking", true],
    [Truck, "Chọn xe", false],
    [BarChart3, "Thống kê", false]
  ];
  const kpiItems: DemoKpiItem[] = [
    ["Hôm nay", 3, CalendarDays],
    ["Tháng này", 74, BarChart3],
    ["Xe nhà", 8, Truck],
    ["Xe ngoài", 5, Truck]
  ];
  const stats = [
    { name: "FUYUAN", export: 2, import: 0, total: 2 },
    { name: "FANGZHENG", export: 0, import: 1, total: 1 }
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
            {navItems.map(([Icon, label, active]) => (
              <button key={String(label)} className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium ${active ? "bg-brand-sky text-brand-blue" : "text-slate-600"}`}>
                <Icon size={18} />
                {String(label)}
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-brand-navy">{"AI ch\u1ecdn xe container"}</h1>
                <p className="text-sm text-slate-500">Nhập dữ liệu, gửi AI xử lý, lưu kết quả và xem thống kê ngày/tháng.</p>
              </div>
              <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none">
                <option>openai/gpt-4o-mini</option>
                <option>anthropic/claude-3.5-sonnet</option>
                <option>google/gemini-flash-1.5</option>
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
                <textarea
                  defaultValue="Hàng xuất khách FUYUAN, booking 267772977, 2 cont, bãi lấy rỗng NAM KHÁNH, hạ CÁT LÁI, hãng tàu MAERSK."
                  className="min-h-36 w-full resize-y rounded-md border border-slate-200 p-3 text-sm outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <button className="flex h-10 items-center gap-2 rounded-md bg-brand-blue px-4 text-sm font-semibold text-white">
                    <Send size={16} />
                    Gửi AI xử lý & lưu
                  </button>
                  <button className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700">
                    <Truck size={16} />
                    AI chọn xe
                  </button>
                  <button className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700">
                    <Save size={16} />
                    Kích xuất & lưu báo cáo
                  </button>
                </div>
              </div>
              <div className="border-t border-slate-200 p-4">
                <p className="mb-3 text-sm font-semibold text-brand-navy">Kết quả AI</p>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                  <MarkdownBlock text={aiResult} />
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
                <h2 className="text-sm font-semibold text-brand-navy">Thống kê ngày</h2>
                <table className="mt-3 w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr><th className="py-2">Khách</th><th className="py-2 text-right">Xuất</th><th className="py-2 text-right">Nhập</th><th className="py-2 text-right">Tổng</th></tr>
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
                  </tbody>
                </table>
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
                  <tr>{["Ngày", "Khách", "Booking/File", "Cont", "Tuyến", "Xe chọn", "Loại", "Nhà xe", "Giá", "Lý do"].map((head) => <th key={head} className="border-b border-slate-200 px-3 py-2 font-semibold">{head}</th>)}</tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-slate-100 px-3 py-2">27/05/2026</td>
                    <td className="border-b border-slate-100 px-3 py-2">FUYUAN</td>
                    <td className="border-b border-slate-100 px-3 py-2">267772977</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-right">2</td>
                    <td className="border-b border-slate-100 px-3 py-2">NAM KHÁNH - CÁT LÁI</td>
                    <td className="border-b border-slate-100 px-3 py-2">DM-01-01</td>
                    <td className="border-b border-slate-100 px-3 py-2">Xe nhà</td>
                    <td className="border-b border-slate-100 px-3 py-2">Dương Minh</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-right">0 VND</td>
                    <td className="border-b border-slate-100 px-3 py-2">Ưu tiên xe nhà Đội 1 đang available.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
