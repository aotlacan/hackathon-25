// src/Rooms.jsx
import React, { useEffect, useState } from "react";
import RoomReviews from "./RoomReviews";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

export default function Rooms({ brn }) {
  const [rooms, setRooms] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  if(!brn || brn === "") {
    return <p>Please select a building to see rooms.</p>;
  }

  useEffect(() => {
    (async () => {
      setStatus("loading");
      try {
        const res = await fetch(`${API_BASE}/rooms?brn=${encodeURIComponent(brn)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRooms(Array.isArray(data.rooms) ? data.rooms : []);
        setStatus("ok");
      } catch (e) {
        setError(String(e));
        setStatus("error");
      }
    })();
  }, [brn]);

  return (
    <section>
      <h2>Building {brn}</h2>

      {status === "loading" && <p>Loading rooms…</p>}

      {status === "error" && (
        <p style={{ color: "crimson" }}>
          Failed to fetch rooms. {error}
          <br />
          Check Worker at {API_BASE}
        </p>
      )}

      {status === "ok" && rooms.length === 0 && <p>No rooms found.</p>}

      {status === "ok" && rooms.length > 0 && (
        <ul>
          {rooms.map((r) => (
            <li key={r.room_id}>
              <div>
                <strong>{r.room_number}</strong>
                {r.floor ? ` (Floor ${r.floor})` : ""}
              </div>
              <RoomReviews roomId={r.room_id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}