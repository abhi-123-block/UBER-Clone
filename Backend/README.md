# Uber-clone Backend

A production-shaped REST + Socket.IO API for a two-sided ride-hailing app
(passengers and captains/drivers), built on Node.js, Express 5, and MongoDB.

## Stack

- Node.js / Express 5 (CommonJS)
- MongoDB + Mongoose
- JWT auth via secure HTTP-only cookies **and** `Authorization: Bearer` headers
- bcryptjs password hashing
- express-validator for input validation
- Socket.IO for real-time ride updates, authenticated with the same JWTs
- No external maps API required — distance/duration/fare use a Haversine
  straight-line estimate by default (see "Maps provider" below)

## Setup

```bash
cd Backend
npm install
cp .env.example .env   # then fill in DB_CONNECT and JWT_SECRET
npm run dev             # starts on http://localhost:4000
```

Required env vars (validated at startup — the process exits with a clear
message if any are missing):

| Var | Description |
|---|---|
| `DB_CONNECT` | MongoDB connection string |
| `JWT_SECRET` | Long random secret used to sign JWTs |

Optional:

| Var | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP port |
| `JWT_EXPIRES_IN` | `24h` | Token lifetime |
| `CORS_ORIGIN` | `http://localhost:5173` | Frontend origin allowed to send credentials |
| `MAPS_PROVIDER` | `none` | `none` uses the built-in Haversine fallback |
| `MAPS_API_KEY` | *(empty)* | Only used if you wire in a real provider (see `services/maps.service.js`) |
| `SURGE_ENABLED` / `SURGE_MULTIPLIER` | `false` / `1.5` | Optional flat surge multiplier |

**Security note:** the uploaded project's `.env` contained a live MongoDB
Atlas connection string and JWT secret in plaintext. Treat both as
compromised — rotate the Atlas database user's password and generate a new
`JWT_SECRET` (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
before using this anywhere beyond local development.

## Running tests

```bash
npm test
```

This runs:
- `tests/fare.test.js` — pure unit tests for fare calculation and the
  Haversine distance formula.
- `tests/ride.service.test.js` — the ride state machine (accept/start/
  complete/cancel) and ownership checks, using mocked Mongoose models so no
  database connection is required.

For a full live end-to-end check against a **real** MongoDB instance, start
the server (`npm run dev`) and, in another terminal, run:

```bash
bash scripts/smoke-test.sh
```

This registers a user and a captain, requests a ride, accepts it, verifies
the OTP, completes the ride, rates it, and prints the captain's earnings —
exercising the entire lifecycle end to end over the real HTTP API.

## API overview

All responses use the same envelope:

```json
{ "success": true, "message": "...", "data": { } }
```

Errors:

```json
{ "success": false, "message": "...", "errors": [ ] }
```

### Auth

| Method | Route | Notes |
|---|---|---|
| POST | `/users/register` | |
| POST | `/users/login` | Sets an httpOnly `token` cookie and also returns the token in the body |
| GET | `/users/profile` | Requires auth |
| PATCH | `/users/profile` | Update phone / profileImage / name |
| GET | `/users/logout` | Blacklists the current token |
| POST | `/captains/register` | Requires `vehicle: { color, plate, capacity, vehicleType }` |
| POST | `/captains/login` | |
| GET | `/captains/profile` | Requires auth |
| PATCH | `/captains/profile` | |
| PATCH | `/captains/status` | `{ "status": "active" \| "inactive" }` — go online/offline |
| PATCH | `/captains/location` | `{ "lat": number, "lng": number }` |
| GET | `/captains/logout` | |

### Rides

| Method | Route | Who | Notes |
|---|---|---|---|
| POST | `/rides/fare-estimate` | user | Returns distance/duration + a fare per vehicle type |
| POST | `/rides/request` | user | Creates the ride and notifies nearby online captains over the socket |
| GET | `/rides/history` | user or captain | Paginated (`?page=&limit=`) |
| GET | `/rides/earnings` | captain | Lifetime completed-ride earnings |
| GET | `/rides/:rideId` | participant only | |
| PATCH | `/rides/:rideId/accept` | captain | `searching` → `accepted` |
| PATCH | `/rides/:rideId/arriving` | captain | `accepted` → `arriving` |
| PATCH | `/rides/:rideId/start` | captain | Requires the rider's OTP; → `started` |
| PATCH | `/rides/:rideId/complete` | captain | `started` → `completed`, bumps both parties' `totalRides` |
| PATCH | `/rides/:rideId/cancel` | user or captain | Only while `searching`/`accepted`/`arriving` |
| POST | `/rides/:rideId/rate` | user or captain | Only once the ride is `completed`; one rating per direction, recomputes the running average |

Every ride action re-checks that the caller is the specific user/captain
attached to that ride (or an unassigned captain for `accept`), independent of
what the client claims.

### Ride status machine

```
searching -> accepted -> arriving -> started -> completed
    \            \           \
     -----------> cancelled <-
```

The OTP is a 4-digit code generated when the ride is created. It's returned
to the rider once, in the `POST /rides/request` response (`data.ride.otp`) —
every other read of a ride (`GET /rides/:id`, socket broadcasts to captains,
history) omits it, since the whole point is that the captain must ask the
rider for it in person before starting the trip.

## Real-time (Socket.IO)

Connect with the JWT in the handshake:

```js
io(BASE_URL, { auth: { token } })
```

Every connection is verified against the same JWT secret as the REST API —
the server looks up the account itself; it never trusts a client-claimed
role or id. Each socket auto-joins a personal room (`user:<id>` or
`captain:<id>`).

Client → server events:
- `join-ride` / `leave-ride` — `{ rideId }`
- `captain:status` — `{ status: 'active' | 'inactive' }` (mirrors the REST endpoint)
- `captain:location` — `{ lat, lng, rideId? }`

Server → client events:
- `ride:new-request` — sent to nearby online captains when a ride is requested
- `ride:accepted` — sent to the rider
- `ride:status-update` — sent on arriving/started (and after accept)
- `ride:cancelled`
- `ride:completed`
- `ride:captain-location` — relayed to everyone in the ride room

## Fare calculation

Rates live in one place, `config/fare.config.js` (base fare, per-km, per-
minute, minimum fare, per vehicle type). `services/fare.service.js` computes
`max(base + perKm*distance + perMinute*duration, minimumFare)`, with an
optional flat surge multiplier. Distance/duration come from
`services/maps.service.js`, which isolates the map-provider boundary: with
no `MAPS_API_KEY` configured it falls back to a Haversine straight-line
calculation (scaled by 1.3x to approximate real road distance) so the whole
app runs with zero external dependencies.

## Known limitations / next steps

- Nearby-captain matching is a simple radius filter (5km) over all active
  captains of the right vehicle type — fine for a demo, but would want a
  geospatial index (`2dsphere`) and `$geoNear` at real scale.
- There's no automatic re-broadcast if the first batch of nearby captains
  all miss/decline a request — a dispatcher/timeout loop would be a good
  next addition.
- Captain-rates-user and user-rates-captain both exist in the schema, but
  the frontend only wires up the user-rates-captain flow.
