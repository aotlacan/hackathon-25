# MBathroom

MBathroom helps University of Michigan students find bathrooms that fit their needs. You can browse buildings, read bathroom reviews, and leave ratings so everyone can find a clean, private spot fast.

Find a live version at: https://flushfinder.pages.dev

## Features
- Interactive campus map powered by OpenStreetMap.
- Average bathroom scores and review highlights per building.
- Submit ratings and comments for a specific room right from the map popup.
- Sidebar room list with live review updates.

## Stack
- Frontend: React (Vite) with Leaflet for maps.
- Backend: Cloudflare Workers + D1 (SQLite).
- Data helpers: Python scripts used during the hackathon to scrape and normalize UMich building info.

## Run It Locally
```bash
# frontend
cd flushfinder-ui
npm install
npm run dev

# backend (requires wrangler login)
cd ../src
wrangler dev --remote
```
Set `flushfinder-ui/.env` with your API base (defaults to the deployed Worker). Tile settings live in `.env.example`.

## Hackathon Journey
- **Inspiration:** Big campus = hard bathroom hunts. We wanted a quick way to compare privacy, cleanliness, and accessibility.
- **Build:** React UI, Cloudflare D1 storage, helper Python scripts, and a bit of generative AI debugging.
- **Challenges:** Learning React on the fly, wrangling Wrangler for hosting, and getting Google/UMich APIs to seed the database.
- **Proud Moments:** Shipping a full-stack app with a remote database, map UI, and live reviews in one weekend.
- **Lessons:** Planning, state management, and Cloudflare tooling for a production-style deployment.
- **What's Next:** Expand beyond UMich to other campuses, libraries, or any place people need a trustworthy bathroom finder.

## Contributing
Open an issue or pull request with ideas. Please keep secrets out of git (see `.gitignore` and `wrangler.example.toml`).
