"use client";

import { useState, useCallback, useEffect } from "react";

interface ImportRow {
  displayName: string;
  hebrewName: string;
  notes: string;
  tags: string;
  eventType: string;
  civilDate: string;
  hebrewDate: string;
  remarks: string;
}

interface ImportResult {
  row: number;
  status: string;
  message?: string;
}

interface ColumnConfig {
  key: keyof ImportRow;
  label: string;
  width: number;
  placeholder: string;
}

const ALL_AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: "displayName", label: "Name *", width: 160, placeholder: "Moshe Cohen" },
  { key: "hebrewName", label: "Hebrew Name", width: 140, placeholder: "משה כהן" },
  { key: "notes", label: "Notes", width: 140, placeholder: "" },
  { key: "tags", label: "Tags (comma sep.)", width: 140, placeholder: "NF, BJ" },
  { key: "eventType", label: "Event Type", width: 100, placeholder: "Yahrzeit" },
  { key: "civilDate", label: "Gregorian Date (YYYY-MM-DD)", width: 150, placeholder: "2000-01-15" },
  { key: "hebrewDate", label: "Hebrew Date", width: 120, placeholder: "7 Tishrei" },
  { key: "remarks", label: "Remarks", width: 140, placeholder: "" },
];

const DEFAULT_COLUMNS = ALL_AVAILABLE_COLUMNS;
const STORAGE_KEY = "importColumnConfig";

const EMPTY_ROW: ImportRow = {
  displayName: "",
  hebrewName: "",
  notes: "",
  tags: "",
  eventType: "",
  civilDate: "",
  hebrewDate: "",
  remarks: "",
};

function makeRows(n: number): ImportRow[] {
  return Array.from({ length: n }, () => ({ ...EMPTY_ROW }));
}

function loadColumnsFromStorage(): ColumnConfig[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const keys = JSON.parse(stored) as (keyof ImportRow)[];
      return keys
        .map((key) => ALL_AVAILABLE_COLUMNS.find((c) => c.key === key))
        .filter((c): c is ColumnConfig => c !== undefined);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveColumnsToStorage(cols: ColumnConfig[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cols.map((c) => c.key)));
  } catch {
    // Ignore storage errors
  }
}

export default function ImportPage() {
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [rows, setRows] = useState<ImportRow[]>(makeRows(10));
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [globalEventType, setGlobalEventType] = useState("Birthday");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadColumnsFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColumns(stored || DEFAULT_COLUMNS);
  }, []);

  // Fetch available event types
  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        const res = await fetch("/api/event-types");
        const data = await res.json();
        const typeNames = data.map((t: { id: string; name: string }) => t.name).sort();
        setEventTypes(typeNames.length > 0 ? typeNames : ["Birthday", "Yahrzeit"]);
        if (typeNames.length > 0 && !typeNames.includes("Birthday")) {
          setGlobalEventType(typeNames[0]);
        }
      } catch {
        setEventTypes(["Birthday", "Yahrzeit"]);
      } finally {
        setLoadingEventTypes(false);
      }
    };
    fetchEventTypes();
  }, []);


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

  const moveColumnUp = (idx: number) => {
    if (idx > 0) {
      setColumns((prev) => {
        const next = [...prev];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        saveColumnsToStorage(next);
        return next;
      });
    }
  };

  const moveColumnDown = (idx: number) => {
    if (idx < columns.length - 1) {
      setColumns((prev) => {
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        saveColumnsToStorage(next);
        return next;
      });
    }
  };

  const removeColumn = (idx: number) => {
    setColumns((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      saveColumnsToStorage(next);
      return next;
    });
  };

  const addColumn = (key: keyof ImportRow) => {
    const col = ALL_AVAILABLE_COLUMNS.find((c) => c.key === key);
    if (col && !columns.find((c) => c.key === key)) {
      setColumns((prev) => {
        const next = [...prev, col];
        saveColumnsToStorage(next);
        return next;
      });
    }
  };

  const resetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
    saveColumnsToStorage(DEFAULT_COLUMNS);
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
          columns.forEach((col, ci) => {
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
    [columns]
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
    if (!globalEventType.trim()) {
      alert("Please select an Event Type");
      return;
    }

    // Filter rows that have displayName and at least one date field
    const nonEmpty = rows.filter((r) => {
      if (!r.displayName.trim()) return false;
      // Must have at least one date field (eventType comes from global dropdown)
      const hasDate = r.civilDate?.trim() || r.hebrewDate?.trim();
      return hasDate;
    });

    if (nonEmpty.length === 0) {
      alert("No valid rows to import. Each row needs: Name and at least one date (Gregorian or Hebrew).");
      return;
    }

    setSaving(true);
    try {
      // Add global eventType to all rows
      const rowsWithEventType = nonEmpty.map((r) => ({
        ...r,
        eventType: globalEventType,
      }));

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rowsWithEventType }),
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
            Paste directly from Excel/Google Sheets, or type rows manually. Use either Gregorian or Hebrew date (or both).
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary" onClick={() => setShowColumnConfig(!showColumnConfig)}>⚙ Columns</button>
          <button className="btn btn-secondary" onClick={addRow}>+ Row</button>
          <button className="btn btn-secondary" onClick={clearAll}>Clear</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      <div style={{
        padding: "12px 16px",
        background: "#f0f9ff",
        border: "1px solid #bfdbfe",
        borderRadius: "4px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <label style={{ fontWeight: 600, whiteSpace: "nowrap", color: "#1e40af" }}>
          Event Type:
        </label>
        <select
          value={globalEventType}
          onChange={(e) => setGlobalEventType(e.target.value)}
          disabled={loadingEventTypes}
          style={{
            padding: "6px 8px",
            border: "1px solid #60a5fa",
            borderRadius: "4px",
            fontSize: "14px",
            backgroundColor: "#fff",
            cursor: loadingEventTypes ? "not-allowed" : "pointer",
            opacity: loadingEventTypes ? 0.6 : 1,
          }}
        >
          {loadingEventTypes ? (
            <option>Loading...</option>
          ) : (
            eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))
          )}
        </select>
        <span style={{ fontSize: "12px", color: "#1e40af" }}>
          → All imported rows will have this event type
        </span>
      </div>

      {showColumnConfig && (
        <div style={{
          padding: "12px 16px",
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "4px",
          marginBottom: "16px",
          fontSize: "13px",
        }}>
          <div style={{ marginBottom: "12px", fontWeight: 600 }}>Configure Columns</div>
          
          <div style={{ marginBottom: "12px" }}>
            <strong>Active columns:</strong>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {columns.map((col, idx) => (
                <div
                  key={col.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: "3px",
                  }}
                >
                  <span style={{ flex: 1 }}>{col.label}</span>
                  <button
                    onClick={() => moveColumnUp(idx)}
                    disabled={idx === 0}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: idx === 0 ? "default" : "pointer",
                      color: idx === 0 ? "#d1d5db" : "#6b7280",
                      padding: "2px 4px",
                      fontSize: "14px",
                    }}
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveColumnDown(idx)}
                    disabled={idx === columns.length - 1}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: idx === columns.length - 1 ? "default" : "pointer",
                      color: idx === columns.length - 1 ? "#d1d5db" : "#6b7280",
                      padding: "2px 4px",
                      fontSize: "14px",
                    }}
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeColumn(idx)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: "2px 4px",
                      fontSize: "12px",
                    }}
                    title="Remove column"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "12px" }}>
            <strong>Add columns:</strong>
            <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {ALL_AVAILABLE_COLUMNS.map((col) => (
                !columns.find((c) => c.key === col.key) && (
                  <button
                    key={col.key}
                    onClick={() => addColumn(col.key)}
                    style={{
                      padding: "4px 8px",
                      background: "#e0e7ff",
                      border: "1px solid #c7d2fe",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "#4338ca",
                    }}
                  >
                    + {col.label}
                  </button>
                )
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "12px" }}>
            <button
              onClick={resetColumns}
              style={{
                padding: "4px 8px",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Reset to default
            </button>
            <div style={{ marginTop: "8px", fontSize: "11px", color: "#059669", fontStyle: "italic" }}>
              ✓ Column configuration is automatically saved
            </div>
          </div>
        </div>
      )}

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
            <>, <span style={{ color: "#dc2626" }}>{errorCount} errors</span></>
          )}
          {results.some((r) => r.status === "skipped") && (
            <>, <span style={{ color: "#ea580c" }}>{results.filter((r) => r.status === "skipped").length} skipped (duplicates)</span></>
          )}
          {results.some((r) => r.status === "partial") && (
            <>, <span style={{ color: "#ea580c" }}>{results.filter((r) => r.status === "partial").length} partial</span></>
          )}
          {(errorCount > 0 || results.some((r) => r.status === "skipped" || r.status === "partial")) && (
            <>
              <ul style={{ margin: "8px 0 0 16px" }}>
                {results
                  .filter((r) => r.status === "error" || r.status === "skipped" || r.status === "partial")
                  .map((r) => (
                    <li key={r.row} style={{ color: r.status === "error" ? "#dc2626" : "#ea580c" }}>
                      Row {r.row + 1} ({r.status}): {r.message}
                    </li>
                  ))}
              </ul>
            </>
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
              {columns.map((col) => (
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
                  : result?.status === "skipped" || result?.status === "partial"
                  ? "#fef3c7"
                  : undefined;
              return (
                <tr key={rowIdx} style={{ background: rowBg }}>
                  <td style={{ color: "#9ca3af", fontSize: "11px", textAlign: "center" }}>
                    {rowIdx + 1}
                  </td>
                  {columns.map((col) => (
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
        <div>Tip: Copy columns from Excel and paste into this table. Columns will map in order: {columns.map((c) => c.label).join(" → ")}</div>
        <div style={{ marginTop: "8px" }}>Date format: Gregorian as YYYY-MM-DD (e.g. 2000-01-15) or Hebrew as &quot;day Month&quot; (e.g. 7 Tishrei) or &quot;Month day&quot; (e.g. Tisri 7). Duplicates will be skipped.</div>
        <div style={{ marginTop: "8px" }}>For event import: each row needs Name and at least one date (Gregorian or Hebrew). The Event Type is set at the top in the dropdown.</div>
        <div style={{ marginTop: "8px" }}>Use the &quot;⚙ Columns&quot; button to customize column order and visibility. Your configuration is automatically saved.</div>
      </div>
    </div>
  );
}
