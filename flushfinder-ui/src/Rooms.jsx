import React, { useEffect, useState } from "react";
import RoomReviews from "./RoomReviews"; // add this import at top


const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";
const DEFAULT_BRN = import.meta.env.VITE_DEFAULT_BRN || "1005092";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setStatus("loading");
      try {
        const res = await fetch(`${API_BASE}/rooms?brn=${encodeURIComponent(DEFAULT_BRN)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRooms(Array.isArray(data.rooms) ? data.rooms : []);
        setStatus("ok");
      } catch (e) {
        setError(String(e));
        setStatus("error");
      }
    })();
  }, []);

  return (
    <section>
      <h2>Building {DEFAULT_BRN}</h2>
      {status === "loading" && <p>Loading rooms…</p>}
      {status === "error" && (
        <p style={{ color: "crimson" }}>
          Failed to fetch rooms. {error}<br />
          Check Worker at {API_BASE}
        </p>
      )}
      {status === "ok" && rooms.length === 0 && <p>No rooms found.</p>}
      {status === "ok" && rooms.length > 0 && (
        <ul>
          {rooms.map((r) => (
            <li key={r.room_id}>
              <strong>{r.room_number}</strong> {r.floor ? `(Floor ${r.floor})` : ""}
              <li key={r.room_id}>
                <strong>{r.room_number}</strong> (Floor {r.floor})
                <RoomReviews roomId={r.room_id} />
                </li>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}