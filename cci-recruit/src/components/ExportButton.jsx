import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";

export default function ExportButton({ data = [], filename = "export", title = "Report", columns = [] }) {
  const [loading, setLoading] = useState(false);

  const getRow = (item) =>
    columns.map((col) => (col.accessor ? col.accessor(item) : item[col.key] ?? ""));

  const exportCSV = () => {
    const headers = columns.map((c) => c.label).join(",");
    const rows = data.map((item) => getRow(item).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    setLoading(true);
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(9);
    const headers = columns.map((c) => c.label);
    const rows = data.map((item) => getRow(item).map(String));
    let y = 28;
    const colW = Math.floor(180 / headers.length);
    // header row
    doc.setFont(undefined, "bold");
    headers.forEach((h, i) => doc.text(h, 14 + i * colW, y));
    doc.setFont(undefined, "normal");
    y += 6;
    rows.forEach((row) => {
      if (y > 280) { doc.addPage(); y = 18; }
      row.forEach((cell, i) => doc.text(String(cell).substring(0, 20), 14 + i * colW, y));
      y += 6;
    });
    doc.save(`${filename}.pdf`);
    setLoading(false);
  };

  const printReport = () => {
    const headers = columns.map((c) => `<th style="padding:6px 10px;border:1px solid #ddd;background:#f5f5f5">${c.label}</th>`).join("");
    const rows = data.map((item) =>
      `<tr>${getRow(item).map((v) => `<td style="padding:6px 10px;border:1px solid #ddd">${v}</td>`).join("")}</tr>`
    ).join("");
    const html = `<html><head><title>${title}</title></head><body>
      <h2 style="font-family:sans-serif">${title}</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:12px">
        <thead><tr>${headers}</tr></thead><tbody>${rows}</tbody>
      </table></body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={loading}>
          <Download className="h-4 w-4" />
          {loading ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV}>Export CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF}>Export PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={printReport}>Print</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}