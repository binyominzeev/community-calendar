"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Tag {
  id: number;
  name: string;
}

interface EventType {
  id: number;
  name: string;
}

interface EventRecord {
  id: number;
  personId: number;
  eventTypeId: number;
  eventType: { id: number; name: string };
  hebrewDay: number;
  hebrewMonth: number;
  remarks: string | null;
}

interface Person {
  id: number;
  displayName: string;
  hebrewName: string | null;
  notes: string | null;
  personTags: { tag: Tag }[];
  events: EventRecord[];
}

const HEBREW_MONTHS: Record<number, string> = {
  1: "Nisan", 2: "Iyyar", 3: "Sivan", 4: "Tamuz", 5: "Av", 6: "Elul",
  7: "Tishrei", 8: "Cheshvan", 9: "Kislev", 10: "Tevet", 11: "Shvat",
  12: "Adar", 13: "Adar II",
};

function HebrewDateDisplay({ day, month }: { day: number; month: number }) {
  return <span>{day} {HEBREW_MONTHS[month] ?? month}</span>;
}

interface EventFormProps {
  eventTypes: EventType[];
  initial?: Partial<EventRecord>;
  onSave: (data: { eventTypeId: number; hebrewDay: number; hebrewMonth: number; remarks: string }) => Promise<void>;
  onCancel: () => void;
}

function EventForm({ eventTypes, initial, onSave, onCancel }: EventFormProps) {
  const [eventTypeId, setEventTypeId] = useState(initial?.eventTypeId ?? eventTypes[0]?.id ?? 0);
  const [hebrewDay, setHebrewDay] = useState(initial?.hebrewDay ?? 1);
  const [hebrewMonth, setHebrewMonth] = useState(initial?.hebrewMonth ?? 7);
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ eventTypeId, hebrewDay, hebrewMonth, remarks });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <select
        className="input"
        style={{ width: "auto" }}
        value={eventTypeId}
        onChange={(e) => setEventTypeId(Number(e.target.value))}
      >
        {eventTypes.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <select
        className="input"
        style={{ width: "auto" }}
        value={hebrewMonth}
        onChange={(e) => setHebrewMonth(Number(e.target.value))}
      >
        {Object.entries(HEBREW_MONTHS).map(([num, name]) => (
          <option key={num} value={num}>{name}</option>
        ))}
      </select>
      <input
        className="input"
        type="number"
        style={{ width: "70px" }}
        min={1}
        max={30}
        value={hebrewDay}
        onChange={(e) => setHebrewDay(Number(e.target.value))}
        placeholder="Day"
      />
      <input
        className="input"
        style={{ width: "160px" }}
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Remarks (optional)"
      />
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "…" : "Save"}
      </button>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

interface PersonRowProps {
  person: Person;
  allTags: Tag[];
  eventTypes: EventType[];
  onUpdate: () => void;
}

function PersonRow({ person, allTags, eventTypes, onUpdate }: PersonRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(person.displayName);
  const [hebrewName, setHebrewName] = useState(person.hebrewName ?? "");
  const [notes, setNotes] = useState(person.notes ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    person.personTags.map((pt) => pt.tag.id)
  );
  const [addingEvent, setAddingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const savePerson = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/people/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, hebrewName, notes, tagIds: selectedTagIds }),
      });
      setEditing(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const deletePerson = async () => {
    if (!confirm(`Delete ${person.displayName}?`)) return;
    await fetch(`/api/people/${person.id}`, { method: "DELETE" });
    onUpdate();
  };

  const addEvent = async (data: { eventTypeId: number; hebrewDay: number; hebrewMonth: number; remarks: string }) => {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, personId: person.id }),
    });
    setAddingEvent(false);
    onUpdate();
  };

  const updateEvent = async (eventId: number, data: { eventTypeId: number; hebrewDay: number; hebrewMonth: number; remarks: string }) => {
    await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditingEventId(null);
    onUpdate();
  };

  const deleteEvent = async (eventId: number) => {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    onUpdate();
  };

  return (
    <>
      <tr>
        <td>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              color: "#6b7280",
              padding: "0 4px",
            }}
          >
            {expanded ? "▼" : "▶"}
          </button>
        </td>
        <td>
          {editing ? (
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && savePerson()}
              autoFocus
            />
          ) : (
            <strong>{person.displayName}</strong>
          )}
        </td>
        <td>
          {editing ? (
            <input
              className="input"
              value={hebrewName}
              onChange={(e) => setHebrewName(e.target.value)}
              placeholder="Hebrew name"
            />
          ) : (
            <span style={{ color: hebrewName ? "#374151" : "#9ca3af" }}>
              {person.hebrewName || "—"}
            </span>
          )}
        </td>
        <td>
          {editing ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {allTags.map((tag) => (
                <label key={tag.id} style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "12px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {person.personTags.map((pt) => (
                <span key={pt.tag.id} className="badge badge-blue">{pt.tag.name}</span>
              ))}
            </div>
          )}
        </td>
        <td>
          {editing ? (
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
            />
          ) : (
            <span style={{ color: "#6b7280", fontSize: "12px" }}>{person.notes || ""}</span>
          )}
        </td>
        <td>
          <span style={{ color: "#6b7280", fontSize: "12px" }}>
            {person.events.length} event{person.events.length !== 1 ? "s" : ""}
          </span>
        </td>
        <td>
          {editing ? (
            <div style={{ display: "flex", gap: "4px" }}>
              <button className="btn btn-primary" onClick={savePerson} disabled={saving}>
                {saving ? "…" : "Save"}
              </button>
              <button className="btn btn-secondary" onClick={() => {
                setEditing(false);
                setDisplayName(person.displayName);
                setHebrewName(person.hebrewName ?? "");
                setNotes(person.notes ?? "");
                setSelectedTagIds(person.personTags.map((pt) => pt.tag.id));
              }}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "4px" }}>
              <button className="btn btn-secondary" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn btn-danger" onClick={deletePerson}>Delete</button>
            </div>
          )}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={7} style={{ background: "#f8fafc", paddingLeft: "48px", paddingBottom: "12px" }}>
            <div style={{ borderLeft: "3px solid #dbeafe", paddingLeft: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Events
                </strong>
                {!addingEvent && (
                  <button className="btn btn-secondary" style={{ fontSize: "12px" }} onClick={() => setAddingEvent(true)}>
                    + Add Event
                  </button>
                )}
              </div>

              {person.events.length === 0 && !addingEvent && (
                <p style={{ color: "#9ca3af", fontSize: "12px" }}>No events yet.</p>
              )}

              {person.events.map((ev) => (
                <div key={ev.id} style={{ marginBottom: "8px" }}>
                  {editingEventId === ev.id ? (
                    <EventForm
                      eventTypes={eventTypes}
                      initial={ev}
                      onSave={(data) => updateEvent(ev.id, data)}
                      onCancel={() => setEditingEventId(null)}
                    />
                  ) : (
                    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                      <span className={`badge ${ev.eventType.name === "Yahrzeit" ? "badge-orange" : "badge-green"}`}>
                        {ev.eventType.name}
                      </span>
                      <HebrewDateDisplay day={ev.hebrewDay} month={ev.hebrewMonth} />
                      {ev.remarks && (
                        <span style={{ color: "#6b7280", fontSize: "12px" }}>{ev.remarks}</span>
                      )}
                      <button className="btn btn-secondary" style={{ fontSize: "11px", padding: "2px 8px" }} onClick={() => setEditingEventId(ev.id)}>
                        Edit
                      </button>
                      <button className="btn btn-danger" style={{ fontSize: "11px", padding: "2px 8px" }} onClick={() => deleteEvent(ev.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {addingEvent && (
                <EventForm
                  eventTypes={eventTypes}
                  onSave={addEvent}
                  onCancel={() => setAddingEvent(false)}
                />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface NewPersonFormProps {
  allTags: Tag[];
  onSave: (data: { displayName: string; hebrewName: string; notes: string; tagIds: number[] }) => Promise<void>;
  onCancel: () => void;
}

function NewPersonForm({ allTags, onSave, onCancel }: NewPersonFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [hebrewName, setHebrewName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await onSave({ displayName, hebrewName, notes, tagIds: selectedTagIds });
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr style={{ background: "#eff6ff" }}>
      <td></td>
      <td>
        <input
          className="input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name *"
          autoFocus
        />
      </td>
      <td>
        <input
          className="input"
          value={hebrewName}
          onChange={(e) => setHebrewName(e.target.value)}
          placeholder="Hebrew name"
        />
      </td>
      <td>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {allTags.map((tag) => (
            <label key={tag.id} style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={selectedTagIds.includes(tag.id)}
                onChange={() => toggleTag(tag.id)}
              />
              {tag.name}
            </label>
          ))}
        </div>
      </td>
      <td>
        <input
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
        />
      </td>
      <td></td>
      <td>
        <div style={{ display: "flex", gap: "4px" }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "…" : "Add"}
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [missingFilter, setMissingFilter] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (tagFilter) params.set("tag", tagFilter);
      if (missingFilter) params.set("missing", missingFilter);

      const [peopleRes, tagsRes, typesRes] = await Promise.all([
        fetch(`/api/people?${params}`),
        fetch("/api/tags"),
        fetch("/api/event-types"),
      ]);
      const [peopleData, tagsData, typesData] = await Promise.all([
        peopleRes.json(),
        tagsRes.json(),
        typesRes.json(),
      ]);
      setPeople(peopleData);
      setAllTags(tagsData);
      setEventTypes(typesData);
    } finally {
      setLoading(false);
    }
  }, [search, tagFilter, missingFilter]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(fetchData, 250);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [fetchData]);

  const addPerson = async (data: { displayName: string; hebrewName: string; notes: string; tagIds: number[] }) => {
    await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setAddingPerson(false);
    fetchData();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>People</h1>
        <button
          className="btn btn-primary"
          onClick={() => setAddingPerson(true)}
          disabled={addingPerson}
        >
          + Add Person
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ width: "240px" }}
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          style={{ width: "160px" }}
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
        <select
          className="input"
          style={{ width: "200px" }}
          value={missingFilter}
          onChange={(e) => setMissingFilter(e.target.value)}
        >
          <option value="">No filter</option>
          <option value="hebrewName">Missing Hebrew name</option>
          <option value="birthday">Missing Birthday</option>
          <option value="yahrzeit">Missing Yahrzeit</option>
        </select>
        {(search || tagFilter || missingFilter) && (
          <button
            className="btn btn-secondary"
            onClick={() => { setSearch(""); setTagFilter(""); setMissingFilter(""); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "24px" }}></th>
              <th>Name</th>
              <th>Hebrew Name</th>
              <th>Tags</th>
              <th>Notes</th>
              <th>Events</th>
              <th style={{ width: "180px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {addingPerson && (
              <NewPersonForm
                allTags={allTags}
                onSave={addPerson}
                onCancel={() => setAddingPerson(false)}
              />
            )}
            {people.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                allTags={allTags}
                eventTypes={eventTypes}
                onUpdate={fetchData}
              />
            ))}
            {people.length === 0 && !addingPerson && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#9ca3af" }}>
                  No people found.{" "}
                  <button className="btn btn-primary" onClick={() => setAddingPerson(true)}>
                    Add the first person
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: "12px", fontSize: "12px", color: "#9ca3af" }}>
        {people.length} {people.length === 1 ? "person" : "people"} shown
      </div>
    </div>
  );
}
