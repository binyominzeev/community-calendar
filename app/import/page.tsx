"use client";

import { useState, useCallback } from "react";

interface ImportRow {
  displayName: string;
  hebrewName: string;
  notes: string;
  tags: string;
  eventType: string;
  hebrewDate: string;
  remarks: string;
}

interface ImportResult {
  row: number;
  status: string;
  message?: string;
}

const COLUMNS: { key: keyof ImportRow; label: string; width: number; placeholder: string }[] = [
  { key: "displayName", label: "Name *", width: 160, placeholder: "Moshe Cohen" },
  { key: "hebrewName", label: "Hebrew Name", width: 140, placeholder: "משה כהן" },
  { key: "notes", label: "Notes", width: 140, placeholder: "" },
  { key: "tags", label: "Tags (comma sep.)", width: 140, placeholder: "NF, BJ" },
  { key: "eventType", label: "Event Type", width: 100, placeholder: "Yahrzeit" },
  { key: "hebrewDate", label: "Hebrew Date", width: 120, placeholder: "7 Tishrei" },
  { key: "remarks", label: "Remarks", width: 140, placeholder: "" },
];

const EMPTY_ROW: ImportRow = {
  displayName: "",
  hebrewName: "",
  notes: "",
  tags: "",
  eventType: "",
  hebrewDate: "",
  remarks: "",
};

function makeRows(n: number): ImportRow[] {
  return Array.from({ length: n }, () => ({ ...EMPTY_ROW }));
}

export default function ImportPage() {
  const [rows, setRows] = useState<ImportRow[]>(makeRows(10));
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);

  const updateCell = (rowIdx: number, key: keyof ImportRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [key]: value };
      // Auto-extend when last row is used
      if (rowIdx === next.length - 1 && value.trim()) {
        next.push({ ...EMPTY_ROW });
      }
      return next;
    });
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTableElement>) => {
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      e.preventDefault();

      const pastedRows = text
        .trim()
        .split("\n")
        .map((line) => line.split("\t"));

      setRows((prev) => {
        const updated = [...prev];
        pastedRows.forEach((cols, ri) => {
          if (ri >= updated.length) updated.push({ ...EMPTY_ROW });
          const row = { ...updated[ri] };
          COLUMNS.forEach((col, ci) => {
            if (ci < cols.length) {
              (row as Record<string, string>)[col.key] = cols[ci].trim();
            }
          });
          updated[ri] = row;
        });
        // Ensure there are always some empty rows at the bottom
        if (updated[updated.length - 1]?.displayName) {
          updated.push({ ...EMPTY_ROW });
        }
        return updated;
      });
      setPasteHint(true);
      setTimeout(() => setPasteHint(false), 2000);
    },
    []
  );

  const deleteRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  };

  const clearAll = () => {
    setRows(makeRows(10));
    setResults(null);
  };

  const handleSave = async () => {
    const nonEmpty = rows.filter((r) => r.displayName.trim());
    if (nonEmpty.length === 0) {
      alert("No rows to import.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: nonEmpty }),
      });
      const data = await res.json();
      setResults(data.results);
    } finally {
      setSaving(false);
    }
  };

  const successCount = results?.filter((r) => r.status === "ok").length ?? 0;
  const errorCount = results?.filter((r) => r.status === "error").length ?? 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Import</h1>
          <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "4px" }}>
            Paste directly from Excel/Google Sheets, or type rows manually. Columns:{" "}
            {COLUMNS.map((c) => c.label).join(", ")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary" onClick={addRow}>+ Row</button>
          <button className="btn btn-secondary" onClick={clearAll}>Clear</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      {pasteHint && (
        <div style={{
          padding: "8px 12px",
          background: "#dcfce7",
          color: "#15803d",
          borderRadius: "4px",
          marginBottom: "8px",
          fontSize: "13px",
        }}>
          ✓ Data pasted from clipboard
        </div>
      )}

      {results && (
        <div style={{
          padding: "12px 16px",
          background: errorCount > 0 ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${errorCount > 0 ? "#fca5a5" : "#bbf7d0"}`,
          borderRadius: "4px",
          marginBottom: "16px",
          fontSize: "13px",
        }}>
          <strong>{successCount} imported successfully</strong>
          {errorCount > 0 && (
            <>, <span style={{ color: "#dc2626" }}>{errorCount} errors</span>:</>
          )}
          {errorCount > 0 && (
            <ul style={{ margin: "8px 0 0 16px" }}>
              {results
                .filter((r) => r.status === "error")
                .map((r) => (
                  <li key={r.row} style={{ color: "#dc2626" }}>
                    Row {r.row + 1}: {r.message}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table
          className="data-table"
          onPaste={handlePaste}
          style={{ tableLayout: "fixed", minWidth: "900px" }}
        >
          <thead>
            <tr>
              <th style={{ width: "32px" }}>#</th>
              {COLUMNS.map((col) => (
                <th key={col.key} style={{ width: col.width }}>{col.label}</th>
              ))}
              <th style={{ width: "40px" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const result = results?.[rowIdx];
              const rowBg =
                result?.status === "ok"
                  ? "#f0fdf4"
                  : result?.status === "error"
                  ? "#fef2f2"
                  : undefined;
              return (
                <tr key={rowIdx} style={{ background: rowBg }}>
                  <td style={{ color: "#9ca3af", fontSize: "11px", textAlign: "center" }}>
                    {rowIdx + 1}
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} style={{ padding: "2px 4px" }}>
                      <input
                        className="input"
                        value={(row as unknown as Record<string, string>)[col.key]}
                        onChange={(e) => updateCell(rowIdx, col.key, e.target.value)}
                        placeholder={col.placeholder}
                        style={{ fontSize: "12px" }}
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      onClick={() => deleteRow(rowIdx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#9ca3af",
                        cursor: "pointer",
                        fontSize: "14px",
                        padding: "2px 4px",
                      }}
                      title="Delete row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "12px", fontSize: "12px", color: "#9ca3af" }}>
        Tip: Copy columns from Excel and paste into this table. Columns will map in order:{" "}
        {COLUMNS.map((c) => c.label).join(" → ")}
      </div>
    </div>
  );
}
