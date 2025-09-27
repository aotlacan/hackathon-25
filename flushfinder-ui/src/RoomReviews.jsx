import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8787";

export default function RoomReviews({ roomId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/reviews/${encodeURIComponent(roomId)}`);
        const data = await res.json();
        if (alive) setReviews(data.reviews || []);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [roomId]);

  if (loading) return <div style={{ color: "#aaa" }}>Loading reviews…</div>;
  if (!reviews.length) return <div style={{ color: "#aaa" }}>No reviews yet.</div>;

  return (
    <ul style={{ marginTop: 6 }}>
      {reviews.map(r => (
        <li key={r.id}>⭐ {r.stars}/5 — {r.user_id}</li>
      ))}
    </ul>
  );
}