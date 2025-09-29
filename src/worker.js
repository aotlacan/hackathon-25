// src/worker.js

// ---- CORS (open for dev/hackathon) ----
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Small helper for JSON responses
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const { pathname, searchParams } = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // Simple landing page so "/" isn't 404
    if (request.method === "GET" && pathname === "/") {
      const html = `
        <pre>
Flushfinder API

GET  /rooms?brn=&lt;BUILDING_RECORD_NUMBER&gt;
GET  /rooms/:id/summary
GET  /reviews/:roomId
GET  /building
POST /reviews  body: { room_id, user_id, stars }

Try:
- /rooms?brn=1005092
- /rooms/0/summary
- /reviews/0
        </pre>`;
      return new Response(html, { headers: { "Content-Type": "text/html", ...CORS } });
    }

    // ---- GET /rooms?brn=1005092 ----
    if (request.method === "GET" && pathname === "/rooms") {
      const brn = searchParams.get("brn");
      if(brn === 0) return({json : {"room_id":0,"room_number":0,"floor":0}});
      if (!brn) return json({ error: "Missing brn" }, 400);

      try {
        const { results } = await env.flushfinder
          .prepare(
            `SELECT room_id, room_number, floor
               FROM rooms
              WHERE building_record_number = ?
           ORDER BY floor, room_number`
          )
          .bind(brn)
          .all();

        return json({ rooms: results });
      } catch (e) {
        return json({ error: "DB error", detail: String(e) }, 500);
      }
    }

    // ---- GET /rooms/:id/summary ----
    if (request.method === "GET") {
      const m = pathname.match(/^\/rooms\/([^/]+)\/summary$/);
      if (m) {
        const roomId = m[1];
        try {
          const row = await env.flushfinder
            .prepare(
              `SELECT COUNT(*)  AS review_count,
                      AVG(stars) AS avg_stars,
                      MAX(created_at) AS last_review_at
                 FROM reviews
                WHERE room_id = ?`
            )
            .bind(roomId)
            .first();

          return json({ room_id: roomId, ...row });
        } catch (e) {
          return json({ error: "DB error", detail: String(e) }, 500);
        }
      }
    }

    // ---- GET /reviews/:roomId ----
    if (request.method === "GET") {
      const m = pathname.match(/^\/reviews\/([^/]+)$/);
      if (m) {
        const roomId = m[1];
        try {
          const { results } = await env.flushfinder
            .prepare(
              `SELECT id, room_id, user_id, stars, created_at, review_text
                 FROM reviews
                WHERE room_id = ?
             ORDER BY datetime(created_at) DESC`
            )
            .bind(roomId)
            .all();

          return json({ room_id: roomId, reviews: results });
        } catch (e) {
          return json({ error: "DB error", detail: String(e) }, 500);
        }
      }
    }

    // ---- GET /building/:buildingID/reviews ----
    if (request.method === "GET") {
      const m = pathname.match(/^\/building\/([^/]+)\/reviews$/);
      if (m) {
        const buildingID = m[1];
        try {
          const { results } = await env.flushfinder
            .prepare(
              `SELECT reviews.id, reviews.room_record_number, reviews.user_id, reviews.stars, reviews.review_text, reviews.created_at, rooms.building_record_number 
                 FROM reviews JOIN rooms ON reviews.room_record_number=rooms.room_record_number
                WHERE rooms.building_record_number = ?
             ORDER BY datetime(created_at) DESC`
            )
            .bind(buildingID)
            .all();

          return json({ building_id: buildingID, reviews: results });
        } catch (e) {
          return json({ error: "DB error", detail: String(e) }, 500);
        }
      }
    }

    // ---- GET /buildings ----
    if (request.method === "GET" && pathname === "/building") {
      try {
        const { results } = await env.flushfinder
          .prepare(
            `SELECT id, building_name, building_address_number, building_street, building_lat, building_long, num_bathrooms, building_record_number
            FROM building
            ORDER BY id DESC`
          )
          .all();

        return new Response(JSON.stringify({ buildings: results }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // <--- crucial
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        });
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "DB error", detail: String(e) }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
            },
          }
        );
      }
    }


    // ---- POST /reviews ----
    if (request.method === "POST" && pathname === "/reviews") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const roomId = typeof body?.room_id === "string" ? body.room_id.trim() : "";
      const reviewText = typeof body?.review_text === "string" ? body.review_text.trim() : "";
      const usernameRaw = typeof body?.username === "string" ? body.username.trim() : "";
      const userIdRaw = typeof body?.user_id === "string" ? body.user_id.trim() : "";
      const stars = Number(body?.stars);

      if (!roomId || !reviewText || !usernameRaw || ![1, 2, 3, 4, 5].includes(stars)) {
        return json({ error: "Invalid body" }, 400);
      }

      try {
        const roomRow = await env.flushfinder
          .prepare(`SELECT room_record_number FROM rooms WHERE room_id = ?`)
          .bind(roomId)
          .first();

        if (!roomRow?.room_record_number) {
          return json({ error: "Unknown room" }, 404);
        }

        const normalizedUserId = userIdRaw || (() => {
          const slug = usernameRaw
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 48);
          return slug ? `user:${slug}` : `user:${crypto.randomUUID()}`;
        })();
        const displayName = usernameRaw || normalizedUserId;

        await env.flushfinder
          .prepare(`INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)`)
          .bind(normalizedUserId, displayName)
          .run();

        const id = crypto.randomUUID();
        await env.flushfinder
          .prepare(
            `INSERT INTO reviews (id, room_record_number, user_id, stars, created_at, review_text, room_id)
             VALUES (?, ?, ?, ?, datetime('now'), ?, ?)`
          )
          .bind(id, roomRow.room_record_number, normalizedUserId, stars, reviewText, roomId)
          .run();

        return json({ ok: true, id }, 201);
      } catch (e) {
        return json({ error: "DB error", detail: String(e) }, 500);
      }
    }

    // Fallback
    return new Response("Not found", { status: 404, headers: CORS });
  },
};