// src/map.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8787";
const TILE_URL = import.meta.env.VITE_OSM_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = import.meta.env.VITE_OSM_ATTRIBUTION || "&copy; OpenStreetMap contributors";

const CENTER = { lat: 42.29285, lng: -83.7164 };
const POPUP_OFFSET = [0, -24];
const STAR = "\u2b50";
const RATING_OPTIONS = [5, 4, 3, 2, 1];

function slugifyUser(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "anon";
}

const INITIAL_REVIEW = {
  username: "",
  rating: "",
  message: "",
  roomId: "",
};

const buildingIconCache = new Map();
function getBuildingIcon(label) {
  const key = String(label);
  if (buildingIconCache.has(key)) {
    return buildingIconCache.get(key);
  }
  const icon = L.divIcon({
    className: "",
    html: `<div style='background:#ffcb05;border:2px solid #00274c;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:#00274c;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.35);'>${key}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });
  buildingIconCache.set(key, icon);
  return icon;
}

let userIcon = null;
function getUserIcon() {
  if (userIcon) {
    return userIcon;
  }
  userIcon = L.divIcon({
    className: "",
    html: "<div style='background:#34a853;border:2px solid #0b8043;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:700;'>U</div>",
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -22],
  });
  return userIcon;
}

async function averageBuildingRatings(brn) {
  try {
    const res = await fetch(`${API_BASE}/building/${encodeURIComponent(brn)}/reviews`);
    const data = await res.json();
    const arr = Array.isArray(data?.reviews) ? data.reviews : [];
    if (!arr.length) return { rating: 0, reviews: [] };
    const rating = arr.reduce((sum, r) => sum + Number(r?.stars || 0), 0) / arr.length;
    return { rating, reviews: arr };
  } catch (err) {
    console.error("Error fetching building reviews:", err);
    return { rating: 0, reviews: [] };
  }
}

function formatRating(value) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "...";
}

function MapClickReset({ onMapClick }) {
  useMapEvents({
    click: () => {
      onMapClick?.();
    },
  });
  return null;
}

function SearchOverlay({ map, stops = [], onPick }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const next = query.trim().toLowerCase();
    if (!next) return [];
    return stops.filter((s) => s.title?.toLowerCase().includes(next)).slice(0, 8);
  }, [query, stops]);

  const select = useCallback(
    (item) => {
      if (!item) return;
      if (map) {
        const currentZoom = map.getZoom();
        const nextZoom = typeof currentZoom === "number" ? Math.max(currentZoom, 18) : 18;
        map.flyTo(item.position, nextZoom, { duration: 0.5 });
      }
      onPick?.(item);
      setQuery(item.title || "");
    },
    [map, onPick]
  );

  const target = map?.getContainer()?.parentElement;
  if (!target) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(640px, 90vw)",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          position: "relative",
          background: "rgba(255,255,255,0.98)",
          borderRadius: 16,
          padding: "8px 12px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          placeholder="Search buildings..."
          aria-label="Search buildings"
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 16,
            color: "#111",
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, -1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const choice = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
              select(choice);
            } else if (e.key === "Escape") {
              setQuery("");
              setActiveIndex(-1);
            }
          }}
        />

        {query && suggestions.length > 0 && (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: "6px 0",
              position: "absolute",
              left: 0,
              right: 0,
              top: "100%",
              background: "white",
              borderRadius: 12,
              boxShadow: "0 10px 24px rgba(0,0,0,0.15)",
              border: "1px solid rgba(0,0,0,0.06)",
              zIndex: 1000,
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            {suggestions.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(item);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: index === activeIndex ? "rgba(0,0,0,0.06)" : "transparent",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontWeight: 600 }}>{item.title}</span>
                <span style={{ color: "#6b7280" }}>{item.numBathrooms} baths</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    target
  );
}

function LocateOverlay({ map, onLocate }) {
  const target = map?.getContainer()?.parentElement;
  if (!target) {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 1000,
      }}
    >
      <button
        type="button"
        onClick={onLocate}
        style={{
          background: "#fff",
          border: "1px solid #d0d7de",
          borderRadius: 8,
          padding: "8px 10px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          cursor: "pointer",
        }}
      >
        Locate me
      </button>
    </div>,
    target
  );
}

export default function MyMap({ onSelectBuilding }) {
  const [map, setMap] = useState(null);
  const [selected, setSelected] = useState(null);
  const [stops, setStops] = useState([]);
  const [review, setReview] = useState(INITIAL_REVIEW);
  const [userLocation, setUserLocation] = useState(null);
  const [userPopupOpen, setUserPopupOpen] = useState(false);
  const [roomsByBuilding, setRoomsByBuilding] = useState({});
  const [roomsStatus, setRoomsStatus] = useState({ brn: null, loading: false, error: "" });
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/building`);
        const data = await response.json();
        if (!alive) return;
        const nextStops = (data.buildings || [])
          .map((building, index) => {
            const lat = parseFloat(building.building_lat);
            const lng = parseFloat(building.building_long);
            if (Number.isNaN(lat) || Number.isNaN(lng)) {
              return null;
            }
            return {
              position: { lat, lng },
              title: building.building_name,
              numBathrooms: building.num_bathrooms,
              brn: building.building_record_number,
              glyphIndex: index + 1,
            };
          })
          .filter(Boolean);
        setStops(nextStops);
      } catch (err) {
        console.error("Error fetching buildings:", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const markers = useMemo(() => stops, [stops]);
  const handleMapClick = useCallback(() => {
    setSelected(null);
    setUserPopupOpen(false);
  }, []);

  const fetchRooms = useCallback(async (brn) => {
    if (!brn) return [];
    setRoomsStatus({ brn, loading: true, error: "" });
    try {
      const res = await fetch(`${API_BASE}/rooms?brn=${encodeURIComponent(brn)}`);
      if (!res.ok) {
        throw new Error(`Failed to load rooms (HTTP ${res.status})`);
      }
      const data = await res.json();
      const list = Array.isArray(data.rooms) ? data.rooms : [];
      setRoomsByBuilding((prev) => ({ ...prev, [brn]: list }));
      setRoomsStatus({ brn: null, loading: false, error: "" });
      return list;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setRoomsStatus({ brn, loading: false, error: message });
      setRoomsByBuilding((prev) => ({ ...prev, [brn]: prev[brn] ?? [] }));
      throw err;
    }
  }, []);

  const selectWithRating = useCallback(
    async (payload) => {
      setSelected({ ...payload, rating: undefined });
      setReview((prev) => ({ ...INITIAL_REVIEW, username: prev.username }));
      setSubmitError("");
      setSubmitSuccess("");

      if (payload.brn) {
        try {
          await fetchRooms(payload.brn);
        } catch (err) {
          console.warn("Unable to load rooms for building", payload.brn, err);
        }
      }

      if (!payload.brn) {
        return;
      }

      const { rating } = await averageBuildingRatings(payload.brn);
      setSelected((prev) => {
        if (!prev || prev.brn !== payload.brn) {
          return prev;
        }
        return { ...prev, rating };
      });
    },
    [fetchRooms]
  );

  const handleMarkerClick = useCallback(
    (marker) => {
      selectWithRating(marker);
      onSelectBuilding?.(marker.brn);
    },
    [onSelectBuilding, selectWithRating]
  );

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setUserLocation(next);
        setUserPopupOpen(true);
        if (map) {
          const currentZoom = map.getZoom();
          const nextZoom = typeof currentZoom === "number" ? Math.max(currentZoom, 17) : 17;
          map.flyTo(next, nextZoom, { duration: 0.5 });
        }
      },
      (err) => {
        console.warn("Geolocation failed:", err?.message || err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [map]);

  useEffect(() => {
    if (map) {
      locateUser();
    }
  }, [map, locateUser]);

  const selectedBrn = selected?.brn || "";
  const roomsForSelected = useMemo(() => {
    if (!selectedBrn) return [];
    return roomsByBuilding[selectedBrn] || [];
  }, [roomsByBuilding, selectedBrn]);

  useEffect(() => {
    if (!selectedBrn) {
      return;
    }
    const rooms = roomsByBuilding[selectedBrn];
    if (!rooms || rooms.length === 0) {
      return;
    }
    setReview((prev) => {
      if (rooms.some((room) => room.room_id === prev.roomId)) {
        return prev;
      }
      return { ...prev, roomId: rooms[0].room_id };
    });
  }, [roomsByBuilding, selectedBrn]);

  const roomsLoading = roomsStatus.loading && roomsStatus.brn === selectedBrn;
  const roomsError = roomsStatus.brn === selectedBrn ? roomsStatus.error : "";
  const hasRooms = roomsForSelected.length > 0;

  const handleReviewSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedBrn) {
        return;
      }

      setSubmitError("");
      setSubmitSuccess("");

      const username = review.username.trim();
      const message = review.message.trim();
      const ratingValue = Number(review.rating);
      const roomId = review.roomId;

      if (!roomId) {
        setSubmitError("Pick a room to review.");
        return;
      }
      if (!username || !message || !Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
        setSubmitError("Fill out all fields before submitting.");
        return;
      }

      setSubmittingReview(true);
      try {
        const response = await fetch(`${API_BASE}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: roomId,
            review_text: message,
            stars: ratingValue,
            username,
            user_id: slugifyUser(username),
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || `Request failed (${response.status})`);
        }

        setSubmitSuccess("Thanks for your review!");
        setReview((prev) => ({ ...prev, rating: "", message: "" }));
        window.dispatchEvent(
          new CustomEvent("flushfinder:review-submitted", { detail: { roomId } })
        );
        if (selected) {
          await selectWithRating(selected);
        }
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Unable to submit review."
        );
      } finally {
        setSubmittingReview(false);
      }
    },
    [review, selected, selectedBrn, selectWithRating]
  );

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer
        center={CENTER}
        zoom={18}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        whenCreated={setMap}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <MapClickReset onMapClick={handleMapClick} />

        {markers.map((marker, index) => (
          <Marker
            key={`${marker.brn}-${index}`}
            position={marker.position}
            icon={getBuildingIcon(marker.glyphIndex ?? index + 1)}
            eventHandlers={{
              click: () => handleMarkerClick(marker),
            }}
          />
        ))}

        {userLocation && (
          <Marker
            position={userLocation}
            icon={getUserIcon()}
            eventHandlers={{
              click: () => setUserPopupOpen((prev) => !prev),
            }}
          />
        )}

        {userLocation && userPopupOpen && (
          <Popup
            position={userLocation}
            offset={[0, -18]}
            closeButton={false}
            eventHandlers={{
              remove: () => setUserPopupOpen(false),
            }}
          >
            <div style={{ minWidth: 120 }}>You are here.</div>
          </Popup>
        )}

        {selected && (
          <Popup
            key={selected.brn}
            position={selected.position}
            offset={POPUP_OFFSET}
            eventHandlers={{
              remove: () => setSelected(null),
            }}
          >
            <div style={{ minWidth: 260, color: "#00274c" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{selected.title}</div>
              <div style={{ marginBottom: 8 }}>
                {STAR} {formatRating(selected.rating)} | {selected.numBathrooms} Bathrooms
              </div>
              {roomsError && (
                <div style={{ color: "crimson", fontSize: 12, marginBottom: 6 }}>
                  {roomsError}
                </div>
              )}
              <form
                onSubmit={handleReviewSubmit}
                style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: 14 }}
              >
                <input
                  type="text"
                  placeholder="Your name"
                  value={review.username}
                  onChange={(e) => setReview({ ...review, username: e.target.value })}
                  required
                  disabled={submittingReview}
                  style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #ccc" }}
                />
                <select
                  value={review.roomId}
                  onChange={(e) => setReview({ ...review, roomId: e.target.value })}
                  disabled={!hasRooms || submittingReview || roomsLoading}
                  required={hasRooms}
                  style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #ccc" }}
                >
                  <option value="" disabled>
                    {roomsLoading ? "Loading rooms..." : "Select a room"}
                  </option>
                  {roomsForSelected.map((room) => (
                    <option key={room.room_id} value={room.room_id}>
                      Room {room.room_number}{room.floor ? ` - Floor ${room.floor}` : ""}
                    </option>
                  ))}
                </select>
                <select
                  value={review.rating}
                  onChange={(e) => setReview({ ...review, rating: e.target.value })}
                  required
                  disabled={submittingReview}
                  style={{ padding: "4px 6px", borderRadius: 6, border: "1px solid #ccc" }}
                >
                  <option value="">Select rating</option>
                  {RATING_OPTIONS.map((value) => (
                    <option key={value} value={String(value)}>
                      {STAR.repeat(value)} ({value})
                    </option>
                  ))}
                </select>
                <textarea
                  placeholder="Write your message..."
                  value={review.message}
                  onChange={(e) => setReview({ ...review, message: e.target.value })}
                  required
                  rows={2}
                  disabled={submittingReview}
                  style={{ resize: "none", padding: "4px 6px", borderRadius: 6, border: "1px solid #ccc" }}
                />
                {submitError && (
                  <div style={{ color: "crimson", fontSize: 12 }}>{submitError}</div>
                )}
                {submitSuccess && (
                  <div style={{ color: "#047857", fontSize: 12 }}>{submitSuccess}</div>
                )}
                <button
                  type="submit"
                  disabled={submittingReview || roomsLoading || !hasRooms}
                  style={{
                    background: submittingReview ? "#4b5563" : "#00274c",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 8px",
                    cursor: submittingReview ? "wait" : "pointer",
                  }}
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
              {!hasRooms && !roomsLoading && (
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                  No rooms available for reviews in this building yet.
                </div>
              )}
            </div>
          </Popup>
        )}
      </MapContainer>

      {map && (
        <>
          <SearchOverlay
            map={map}
            stops={stops}
            onPick={(item) => {
              if (!item) return;
              selectWithRating(item);
              onSelectBuilding?.(item.brn);
            }}
          />
          <LocateOverlay map={map} onLocate={locateUser} />
        </>
      )}
    </div>
  );
}
