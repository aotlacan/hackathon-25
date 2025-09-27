CREATE TABLE reviews {
    id TEXT PRIMARY_KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
    created_at TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
};

CREATE TABLE rooms {
    room_id TEXT PRIMARY_KEY,
    floor TEXT,
    room_number TEXT NOT NULL,
    building_record_number TEXT NOT NULL
};

CREATE TABLE building  {
    id TEXT PRIMARY_KEY,
    building_name TEXT NOT NULL,
    building_address TEXT NOT NULL,
    building_record_number TEXT NOT NULL,
    num_bathrooms INTEGER NOT NULL
};

CREATE TABLE users {
    user_id TEXT PRIMARY_KEY,
    username TEXT NOT NULL
};