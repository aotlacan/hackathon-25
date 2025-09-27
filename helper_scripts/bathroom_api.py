"""
Fetch RoomInfo for a building from the U-M Buildings API.

Steps:
1. Exchange CLIENT_ID / CLIENT_SECRET for an access token.
2. Use that token to call RoomInfo/{BuildingRecordNumber}.
"""

import requests
import json

# ---- Credentials ----
CLIENT_ID = "frCnLfNNnyauI8yhF8YpHbX4BMTfimT3MVGiuF85zwYWqUf8"
CLIENT_SECRET = "zaO9oZY61Lguz5JFliV3g9GBpZet1z3eeOiTaWJL9LuyASJDWATxRyyrJcdu82m8"

# ---- Endpoints ----
TOKEN_URL = "https://gw.api.it.umich.edu/um/oauth2/token"
ROOMINFO_URL_TEMPLATE = "https://gw.api.it.umich.edu/um/bf/Buildings/v2/RoomInfo/{brn}"

# Pick a BuildingRecordNumber to test, e.g. 004201 = EECS
BUILDING_RECORD_NUMBER = "1000066"


# 1️⃣ Get OAuth2 token
def get_access_token():
    data = {
        "grant_type": "client_credentials",
        "scope": "buildings",
    }
    response = requests.post(
        TOKEN_URL,
        data=data,
        auth=(CLIENT_ID, CLIENT_SECRET),
    )
    response.raise_for_status()
    token_data = response.json()
    return token_data["access_token"]


# 2️⃣ Call RoomInfo with the token
def get_room_info(access_token, brn):
    url = ROOMINFO_URL_TEMPLATE.format(brn=brn)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",

    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()


# 3️⃣ Optional: filter bathrooms
def filter_bathrooms(rooms):
    include = (
        "restroom",
        "toilet",
        "lavatory",
        "men",
        "women",
        "all gender",
        "gender neutral",
    )
    exclude = ("mechanical", "electrical", "janitor", "custodial")

    for r in rooms["ListOfRooms"].values():
        for r1 in r[0].values():
            print(r1)
    return bathrooms


# 4️⃣ Run
if __name__ == "__main__":
    token = get_access_token()
    print("✅ Got access token")

    rooms = get_room_info(token, BUILDING_RECORD_NUMBER)
    print(f"🏢 Total rooms in building {BUILDING_RECORD_NUMBER}: {len(rooms)}")

    bathrooms = filter_bathrooms(rooms)
    print(f"🚻 Bathrooms found: {len(bathrooms)}")
    print(json.dumps(bathrooms[:5], indent=2))