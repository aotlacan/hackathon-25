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
              `SELECT id, room_id, user_id, stars, created_at
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

    // ---- GET /buildings ----
    if (request.method === "GET" && pathname === "/building") {
      try {
        const { results } = await env.flushfinder
          .prepare(
            `SELECT id, building_name, building_address_number, building_street, building_lat, building_long
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

      const stars = Number(body?.stars);
      if (!body?.room_id || !body?.user_id || ![1, 2, 3, 4, 5].includes(stars)) {
        return json({ error: "Invalid body" }, 400);
      }

      try {
        const id = crypto.randomUUID();
        await env.flushfinder
          .prepare(
            `INSERT INTO reviews (id, room_id, user_id, stars, created_at)
             VALUES (?, ?, ?, ?, datetime('now'))`
          )
          .bind(id, body.room_id, body.user_id, stars)
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