"""
Fetch RoomInfo for a building from the U-M Buildings API.

Steps:
1. Exchange CLIENT_ID / CLIENT_SECRET for an access token.
2. Use that token to call RoomInfo/{BuildingRecordNumber}.
"""

import requests
import json
import re
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderUnavailable
import multiprocessing
api_key = "YOUR_GOOGLE_MAPS_API_KEY"

# ---- Credentials ----
CLIENT_ID = "frCnLfNNnyauI8yhF8YpHbX4BMTfimT3MVGiuF85zwYWqUf8"
CLIENT_SECRET = "zaO9oZY61Lguz5JFliV3g9GBpZet1z3eeOiTaWJL9LuyASJDWATxRyyrJcdu82m8"

# ---- Endpoints ----
TOKEN_URL = "https://gw.api.it.umich.edu/um/oauth2/token"
ROOMINFO_URL_TEMPLATE = "https://gw.api.it.umich.edu/um/bf/Buildings/v2/RoomInfo/{brn}/"
BUILDINGINFO_URL = "https://gw.api.it.umich.edu/um/bf/Buildings/v2/BuildingInfo"

# Pick a BuildingRecordNumber to test, e.g. 004201 = EECS
BUILDING_RECORD_NUMBER = "1005092"


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

def get_building_info(access_token):
    url = BUILDINGINFO_URL
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",

    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    r = response.json()

    geolocator = Nominatim(user_agent="my_geocoder")

    print(len(r["ListOfBldgs"]["Buildings"]))

    with open("geocode_result.txt", "w", encoding="utf-8") as f:
        i = 0
        for building in r["ListOfBldgs"]["Buildings"]:
            print(i)
            try:
                if "NORTHWOOD" in building["BuildingLongDescription"]:
                    continue
                if not "ANN" in building["BuildingCity"]:
                    continue
                addy = building["BuildingStreetNumber"] + ", " + building["BuildingStreetName"] + ", " + building["BuildingCity"] + ", " + building["BuildingState"]
                # print(addy)
                location = geolocator.geocode(addy)

                rooms = get_room_info(token, building["BuildingRecordNumber"])
                bathrooms = filter_bathrooms(rooms)
                num_rooms = len(bathrooms)

                if location is None:
                    f.write(f"(\"{i}\", \"{building["BuildingLongDescription"]}\", \"{building["BuildingStreetNumber"]}\", \"{building["BuildingStreetName"]}\", \"{building["BuildingCity"]}\", \"{building["BuildingState"]}\", \"{building["BuildingPostal"]}\", \"{0.0000}\", \"{0.0000}\", \"{building["BuildingRecordNumber"]}\", {num_rooms})\n")
                else:
                    f.write(f"(\"{i}\", \"{building["BuildingLongDescription"]}\", \"{building["BuildingStreetNumber"]}\", \"{building["BuildingStreetName"]}\", \"{building["BuildingCity"]}\", \"{building["BuildingState"]}\", \"{building["BuildingPostal"]}\", \"{location.latitude}\", \"{location.longitude}\", \"{building["BuildingRecordNumber"]}\", {num_rooms})\n")
                i += 1
            except GeocoderUnavailable:
                f.write(f"(\"{i}\", \"{building["BuildingLongDescription"]}\", \"{building["BuildingStreetNumber"]}\", \"{building["BuildingStreetName"]}\", \"{building["BuildingCity"]}\", \"{building["BuildingState"]}\", \"{building["BuildingPostal"]}\", \"{0.0000}\", \"{0.0000}\", \"{building["BuildingRecordNumber"]}\", {num_rooms})\n")
                i += 1
    f.close()
    return r


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
    include = [
        "restroom",
        "lavatory",
        "men",
        "women",
        "all gender",
        "gender neutral",
    ]
    exclude = ("mechanical", "electrical", "janitor", "custodial")

    bathrooms = []
    if rooms["ListOfRooms"] is None:
        return bathrooms
    for r in rooms["ListOfRooms"]["RoomData"]:
        for i in include:
            if re.search(i, r["RoomTypeDescription"].lower()):
                bathrooms.append(r)
                break

    return bathrooms


# 4️⃣ Run
if __name__ == "__main__":
    token = get_access_token()
    print("✅ Got access token")

    get_building_info(token)
    rooms = get_room_info(token, BUILDING_RECORD_NUMBER)
    print(f"🏢 Total rooms in building {BUILDING_RECORD_NUMBER}: {len(rooms)}")

    bathrooms = filter_bathrooms(rooms)
    print(f"🚻 Bathrooms found: {len(bathrooms)}")
    print(bathrooms)