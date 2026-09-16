# Uber-clone

A two-sided ride-hailing app: passengers request rides, captains (drivers)
accept and complete them, with live status updates over Socket.IO.

- `Backend/` — Node.js/Express/MongoDB API + Socket.IO (see `Backend/README.md` for full docs)
- `Frontend/` — React (Vite) app with separate rider and captain flows

## Quick start

```bash
# 1. Backend
cd Backend
npm install
cp .env.example .env      # fill in DB_CONNECT and JWT_SECRET
npm run dev                # http://localhost:4000

# 2. Frontend (in a second terminal)
cd Frontend
npm install
npm run dev                 # http://localhost:5173
```

The frontend's `.env` already points `VITE_BASE_URL` at
`http://localhost:4000`; the backend's `CORS_ORIGIN` defaults to
`http://localhost:5173`, so the two work together out of the box once both
are running against a real MongoDB instance.

## What's implemented

**Auth** — registration/login/logout/profile for both roles, JWT via
httpOnly cookie + Bearer header, token blacklist on logout, role-aware
middleware, centralized error handling, consistent `{success, message,
data}` API envelope.

**Ride lifecycle** — fare estimate, request ride, nearby-captain matching,
accept → arriving → start (OTP-verified) → complete, cancellation with
reason, post-ride rating, ride history, captain earnings. Full state machine
enforcement (e.g. a completed ride can't be "accepted" again) and ownership
checks (only the assigned captain/rider can act on a ride) live in
`Backend/services/ride.service.js`.

**Fare calculation** — configurable per-vehicle rates in
`Backend/config/fare.config.js`; distance/duration via Haversine (no paid
maps API required) isolated behind `Backend/services/maps.service.js` so a
real provider can be swapped in later without touching callers.

**Real-time** — Socket.IO connections authenticated with the same JWTs as
the REST API; ride rooms, captain location broadcasts, and
request/accept/status/cancel/complete notifications.

**Frontend** — the existing auth screens (login/signup for both roles) were
kept as-is; `UserHome` and `CaptainHome` were rebuilt into the actual ride
flow: pickup/destination/vehicle selection → fare estimate → request →
live status via sockets → OTP → cancel/rate, and the mirrored captain-side
online toggle → live location → incoming requests → accept → arriving →
start → complete, plus a ride-history panel and earnings on the captain
side.

## Testing

- `Backend/npm test` — 13 automated tests: fare/Haversine unit tests, and
  mocked-model tests of the ride state machine and ownership checks (no
  database required).
- `Backend/scripts/smoke-test.sh` — full live end-to-end curl script against
  a running server + real MongoDB, exercising the entire ride lifecycle.
- Manually verified in this environment: every backend file passes
  `node --check`, the server boots cleanly with no warnings, and HTTP
  smoke-testing confirmed validation errors, auth guards, 404s, and the
  error envelope all behave correctly. **I could not run a live database in
  this sandbox** (no network path to MongoDB Atlas, and no way to download
  a local `mongod` binary), so the full request→accept→start→complete→rate
  flow has been verified by code review and the mocked state-machine tests,
  not by an actual live run — please run `scripts/smoke-test.sh` locally to
  confirm end-to-end behavior against your own database.
- Frontend: `npm run lint` is clean and `npm run build` succeeds.

## Security note

The uploaded backend's `.env` contained a live MongoDB Atlas connection
string and JWT secret in plaintext. Rotate both before using this beyond
local development — see `Backend/README.md` for details.
