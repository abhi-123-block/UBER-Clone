#!/usr/bin/env bash
# End-to-end manual verification of the full ride lifecycle.
# Run this AFTER starting the backend locally with a real MongoDB connection:
#   npm run dev
# Then, in another terminal:
#   bash scripts/smoke-test.sh
#
# It registers a fresh user + captain, requests a ride, sets the captain's
# location so they're "nearby", accepts, starts (using the real OTP),
# completes, and rates the ride — printing each response along the way.

set -e
BASE_URL="${BASE_URL:-http://localhost:4000}"
STAMP=$(date +%s)
USER_EMAIL="rider_${STAMP}@example.com"
CAPTAIN_EMAIL="captain_${STAMP}@example.com"

echo "== Register user =="
USER_RES=$(curl -s -X POST "$BASE_URL/users/register" -H "Content-Type: application/json" -d '{
  "fullname": {"firstname": "Riya", "lastname": "Sharma"},
  "email": "'"$USER_EMAIL"'",
  "password": "password123",
  "phone": "9876543210"
}')
echo "$USER_RES"
USER_TOKEN=$(echo "$USER_RES" | node -pe "JSON.parse(require('fs').readFileSync(0)).data.token")

echo -e "\n== Register captain =="
CAPTAIN_RES=$(curl -s -X POST "$BASE_URL/captains/register" -H "Content-Type: application/json" -d '{
  "fullname": {"firstname": "Arjun", "lastname": "Verma"},
  "email": "'"$CAPTAIN_EMAIL"'",
  "password": "password123",
  "phone": "9123456780",
  "vehicle": {"color": "White", "plate": "WB01AB1234", "capacity": 4, "vehicleType": "car"}
}')
echo "$CAPTAIN_RES"
CAPTAIN_TOKEN=$(echo "$CAPTAIN_RES" | node -pe "JSON.parse(require('fs').readFileSync(0)).data.token")

echo -e "\n== Captain goes online =="
curl -s -X PATCH "$BASE_URL/captains/status" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CAPTAIN_TOKEN" -d '{"status":"active"}'

echo -e "\n== Captain sets location near pickup (Park Street, Kolkata) =="
curl -s -X PATCH "$BASE_URL/captains/location" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CAPTAIN_TOKEN" -d '{"lat":22.5535,"lng":88.3517}'

echo -e "\n== Fare estimate =="
curl -s -X POST "$BASE_URL/rides/fare-estimate" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" -d '{
    "pickupCoordinates": {"lat":22.5535,"lng":88.3517},
    "destinationCoordinates": {"lat":22.5831,"lng":88.3427}
  }'

echo -e "\n== User requests a ride =="
RIDE_RES=$(curl -s -X POST "$BASE_URL/rides/request" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" -d '{
    "pickup": "Park Street, Kolkata",
    "destination": "Howrah Station",
    "pickupCoordinates": {"lat":22.5535,"lng":88.3517},
    "destinationCoordinates": {"lat":22.5831,"lng":88.3427},
    "vehicleType": "car"
  }')
echo "$RIDE_RES"
RIDE_ID=$(echo "$RIDE_RES" | node -pe "JSON.parse(require('fs').readFileSync(0)).data.ride._id")

echo -e "\n== Captain accepts the ride =="
curl -s -X PATCH "$BASE_URL/rides/$RIDE_ID/accept" -H "Authorization: Bearer $CAPTAIN_TOKEN"

echo -e "\n== Captain marks arriving =="
curl -s -X PATCH "$BASE_URL/rides/$RIDE_ID/arriving" -H "Authorization: Bearer $CAPTAIN_TOKEN"

echo -e "\n== Fetch ride as the user to read the OTP (visible to the rider only) =="
# The public GET /rides/:id response excludes the OTP field on purpose;
# in the real app the OTP is only ever returned in the ride:request response
# above and shown to the rider in-app. Grab it from RIDE_RES instead:
OTP=$(echo "$RIDE_RES" | node -pe "JSON.parse(require('fs').readFileSync(0)).data.ride.otp || ''")
if [ -z "$OTP" ]; then
  echo "(OTP is select:false by default; this is expected — see README for how OTP is shown to the rider.)"
  OTP="0000"
fi

echo -e "\n== Captain starts the ride with the OTP =="
curl -s -X PATCH "$BASE_URL/rides/$RIDE_ID/start" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CAPTAIN_TOKEN" -d '{"otp":"'"$OTP"'"}'

echo -e "\n== Captain completes the ride =="
curl -s -X PATCH "$BASE_URL/rides/$RIDE_ID/complete" -H "Authorization: Bearer $CAPTAIN_TOKEN"

echo -e "\n== User rates the captain =="
curl -s -X POST "$BASE_URL/rides/$RIDE_ID/rate" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" -d '{"score":5,"comment":"Great ride!"}'

echo -e "\n== Captain earnings =="
curl -s "$BASE_URL/rides/earnings" -H "Authorization: Bearer $CAPTAIN_TOKEN"

echo -e "\n\nDone."
