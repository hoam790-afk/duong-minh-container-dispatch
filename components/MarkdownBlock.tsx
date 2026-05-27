export function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const chunks: React.ReactNode[] = [];
  let table: string[] = [];

  function flushTable() {
    if (!table.length) return;
    const rows = table.filter((line) => line.includes("|")).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
    const [head, separator, ...body] = rows;
    chunks.push(
      <div key={`table-${chunks.length}`} className="table-scroll my-3 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[680px] border-collapse text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>{head?.map((cell, idx) => <th key={idx} className="border-b border-slate-200 px-3 py-2 font-semibold">{cell}</th>)}</tr>
          </thead>
          <tbody>
            {(separator ? body : rows.slice(1)).map((row, idx) => (
              <tr key={idx} className="odd:bg-white even:bg-slate-50/60">
                {row.map((cell, cellIdx) => <td key={cellIdx} className="border-b border-slate-100 px-3 py-2 text-slate-700">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    table = [];
  }

  lines.forEach((line, index) => {
    if (line.trim().startsWith("|")) {
      table.push(line);
      return;
    }
    flushTable();
    if (!line.trim()) {
      chunks.push(<div key={index} className="h-2" />);
    } else if (/^[A-C]\.|PHẦN|KẾT LUẬN|SỐ LƯỢNG/.test(line.trim())) {
      chunks.push(<p key={index} className="mt-3 font-semibold text-brand-navy">{line}</p>);
    } else {
      chunks.push(<p key={index} className="leading-6">{line}</p>);
    }
  });
  flushTable();

  return <div className="text-sm text-slate-700">{chunks}</div>;
}
