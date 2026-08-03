"use client";

import { useState, useEffect } from "react";

interface Tag {
  id: number;
  name: string;
  _count?: { personTags: number };
}

interface EventType {
  id: number;
  name: string;
}

function TagsSection() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTags = async () => {
    const res = await fetch("/api/tags");
    setTags(await res.json());
  };

  useEffect(() => { fetchTags(); }, []);

  const createTag = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      fetchTags();
    } finally {
      setSaving(false);
    }
  };

  const saveTag = async (id: number) => {
    if (!editName.trim()) return;
    await fetch(`/api/tags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    fetchTags();
  };

  const deleteTag = async (id: number, name: string) => {
    if (!confirm(`Delete tag "${name}"?`)) return;
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    fetchTags();
  };

  return (
    <section style={{ marginBottom: "40px" }}>
      <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Tags</h2>
      <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "12px" }}>
        Tags are used to group people and filter calendar views.
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          className="input"
          style={{ width: "200px" }}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createTag()}
          placeholder="New tag name…"
        />
        <button className="btn btn-primary" onClick={createTag} disabled={saving}>
          Add Tag
        </button>
      </div>

      <table className="data-table" style={{ maxWidth: "500px" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>People</th>
            <th style={{ width: "140px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((tag) => (
            <tr key={tag.id}>
              <td>
                {editingId === tag.id ? (
                  <input
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveTag(tag.id)}
                    autoFocus
                  />
                ) : (
                  <span className="badge badge-blue">{tag.name}</span>
                )}
              </td>
              <td style={{ color: "#6b7280", fontSize: "12px" }}>
                {tag._count?.personTags ?? 0}
              </td>
              <td>
                {editingId === tag.id ? (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button className="btn btn-primary" onClick={() => saveTag(tag.id)}>Save</button>
                    <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteTag(tag.id, tag.name)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {tags.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", color: "#9ca3af", padding: "24px" }}>
                No tags yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function EventTypesSection() {
  const [types, setTypes] = useState<EventType[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTypes = async () => {
    const res = await fetch("/api/event-types");
    setTypes(await res.json());
  };

  useEffect(() => { fetchTypes(); }, []);

  const createType = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/event-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      fetchTypes();
    } finally {
      setSaving(false);
    }
  };

  const saveType = async (id: number) => {
    if (!editName.trim()) return;
    await fetch(`/api/event-types/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    fetchTypes();
  };

  const deleteType = async (id: number, name: string) => {
    if (!confirm(`Delete event type "${name}"? This will affect all events of this type.`)) return;
    await fetch(`/api/event-types/${id}`, { method: "DELETE" });
    fetchTypes();
  };

  return (
    <section>
      <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Event Types</h2>
      <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "12px" }}>
        Add additional event types as needed. Built-in types: Yahrzeit, Birthday.
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          className="input"
          style={{ width: "200px" }}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createType()}
          placeholder="New type name…"
        />
        <button className="btn btn-primary" onClick={createType} disabled={saving}>
          Add Type
        </button>
      </div>

      <table className="data-table" style={{ maxWidth: "400px" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th style={{ width: "180px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {types.map((type) => (
            <tr key={type.id}>
              <td>
                {editingId === type.id ? (
                  <input
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveType(type.id)}
                    autoFocus
                  />
                ) : (
                  type.name
                )}
              </td>
              <td>
                {editingId === type.id ? (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button className="btn btn-primary" onClick={() => saveType(type.id)}>Save</button>
                    <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setEditingId(type.id); setEditName(type.name); }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteType(type.id, type.name)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {types.length === 0 && (
            <tr>
              <td colSpan={2} style={{ textAlign: "center", color: "#9ca3af", padding: "24px" }}>
                No event types yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "24px" }}>Settings</h1>
      <TagsSection />
      <EventTypesSection />
    </div>
  );
}
