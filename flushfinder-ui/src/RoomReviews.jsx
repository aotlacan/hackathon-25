import React, { useCallback, useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8787";

export default function RoomReviews({ roomId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    const res = await fetch(`${API_BASE}/reviews/${encodeURIComponent(roomId)}`);
    const data = await res.json();
    return Array.isArray(data.reviews) ? data.reviews : [];
  }, [roomId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadReviews()
      .then((list) => {
        if (active) setReviews(list);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadReviews]);

  useEffect(() => {
    let active = true;
    const handler = (event) => {
      if (!active || event?.detail?.roomId !== roomId) return;
      setLoading(true);
      loadReviews()
        .then((list) => {
          if (active) setReviews(list);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    window.addEventListener("flushfinder:review-submitted", handler);
    return () => {
      active = false;
      window.removeEventListener("flushfinder:review-submitted", handler);
    };
  }, [loadReviews, roomId]);

  if (loading) return <div style={{ color: "#aaa" }}>Loading reviews...</div>;
  if (!reviews.length) return <div style={{ color: "#aaa" }}>No reviews yet.</div>;

  return (
    <ul style={{ marginTop: 6 }}>
      {reviews.map((r) => (
        <li key={r.id}>{"\u2b50"} {r.stars}/5 - {r.review_text}</li>
      ))}
    </ul>
  );
}
