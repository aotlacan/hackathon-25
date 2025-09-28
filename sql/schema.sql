PRAGMA foreign_keys = ON;

CREATE TABLE rooms (
  room_id TEXT PRIMARY KEY,
  floor TEXT,
  room_number TEXT NOT NULL,
  building_record_number TEXT NOT NULL
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
  created_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id)
);

CREATE TABLE building (
  id TEXT PRIMARY KEY,
  building_name TEXT NOT NULL,
  building_address_number TEXT NOT NULL,
  building_street TEXT NOT NULL,
  building_city TEXT NOT NULL,
  building_state TEXT NOT NULL,
  building_zip TEXT NOT NULL,
  building_lat TEXT NOT NULL,
  building_long TEXT NOT NULL,
  building_record_number TEXT NOT NULL,
  num_bathrooms INTEGER NOT NULL
);

CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL
);