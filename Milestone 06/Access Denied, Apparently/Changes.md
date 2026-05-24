# Changes.md — Access Denied, Apparently

## Investigation Log

Before any fixes were written, the application was run locally and tested with two accounts to observe the broken behaviour at the network level.

**Accounts used:**
- Account A: `alice@example.com` (event creator)
- Account B: `bob@example.com` (uninvited user)

---

## Checkpoint 1 — Unauthorized Event Discovery

**File:** `server/routes/events.js` — `GET /`

**Observation:**  
The route handler returned the entire `events` array with no filtering:

```js
// BROKEN
res.json(events);
```

As Bob, hitting `GET /api/events` returned **all events** in the system — including Alice's private event that Bob was never invited to. The response returned `200 OK` with the full event list.

**Status Code Observed (broken):** `200 OK` — full list including events Bob has no access to  
**Expected Status Code (after fix):** `200 OK` — list containing ONLY events Bob created or was invited to

---

## Checkpoint 2 — Private Detail Disclosure

**File:** `server/routes/events.js` — `GET /:id`

**Observation:**  
After fetching the event from the in-memory store, the route did no permission check whatsoever. It immediately called `res.json()` with the full event data:

```js
// BROKEN — no access check before returning data
res.json({ ...event, isCreator: ..., isInvited: ... });
```

As Bob, hitting `GET /api/events/<alice-event-id>` directly returned **full event details** — title, description, date, invited guest list, and RSVPs — even though Bob was never invited. Sequential event IDs make this trivially exploitable by iterating from 1 upward.

**Status Code Observed (broken):** `200 OK` — full private event data returned to uninvited user  
**Expected Status Code (after fix):** `403 Forbidden` — no data in response body

---

## Checkpoint 3 — RSVP Gatekeeping Bypass

**File:** `server/routes/events.js` — `POST /:id/rsvp`

**Observation:**  
The RSVP handler had no invitation check and no duplicate check:

```js
// BROKEN — no invitation check, no duplicate check
event.rsvps.push(req.user.id);
res.json({ message: 'RSVP successful', event });
```

As Bob (not invited), sending `POST /api/events/<alice-event-id>/rsvp` returned `200 OK` and recorded Bob's ID in the event's `rsvps` array. Bob could also RSVP multiple times, creating duplicate entries.

**Status Code Observed (broken):** `200 OK` — RSVP recorded for uninvited user  
**Expected Status Code (after fix):**  
- `403 Forbidden` — if user is not in `invitedEmails`  
- `400 Bad Request` — if user has already RSVPed

---

## Checkpoint 4 — Unauthorized Data Deletion

**File:** `server/routes/events.js` — `DELETE /:id`

**Observation:**  
The delete handler performed no ownership check. After finding the event, it immediately spliced it from the array:

```js
// BROKEN — no ownership check before deletion
events.splice(index, 1);
res.json({ message: 'Event deleted' });
```

As Bob, sending `DELETE /api/events/<alice-event-id>` returned `200 OK` and permanently destroyed Alice's event. Any authenticated user with a valid JWT could wipe any event in the system.

**Status Code Observed (broken):** `200 OK` — event destroyed by non-owner  
**Expected Status Code (after fix):** `403 Forbidden` — event untouched

---

## Checkpoint 5 — Misleading UI

**File:** `client/src/pages/EventDetail.jsx`

**Observation:**  
Both the RSVP and Delete buttons were rendered unconditionally for every authenticated user on every event:

```jsx
{/* BROKEN — buttons shown to everyone regardless of permissions */}
<button onClick={handleRSVP}>RSVP for Event</button>
<button onClick={handleDelete}><Trash2 /></button>
```

As Bob (not invited, not creator), opening Alice's event detail page in the UI showed **both** the RSVP button and the Delete button. The UI was actively inviting Bob to perform actions he should never be able to take. Clicking either button would hit the API and succeed under the broken backend.

**UI State Observed (broken):** RSVP + Delete buttons visible to all users on all events  
**UI State Expected (after fix):** Buttons conditionally rendered based on `isInvited` and `isCreator` flags

---

## Fixes Applied

### Fix 1 — Event List Filter (`server/routes/events.js`)

**Changed:** `GET /` handler now filters the events array before responding.

```js
// BEFORE
res.json(events);

// AFTER
const accessibleEvents = events.filter(event =>
    event.creatorId === req.user.id ||
    event.invitedEmails.includes(req.user.email)
);
res.json(accessibleEvents);
```

Bob can no longer discover Alice's event via the event list. The list only shows events Bob created or was explicitly invited to.

---

### Fix 2 — Event Detail Access Check (`server/routes/events.js`)

**Changed:** `GET /:id` handler now checks permissions before returning any data.

```js
// AFTER — access control check added
const isCreator = event.creatorId === req.user.id;
const isInvited = event.invitedEmails.includes(req.user.email);

if (!isCreator && !isInvited) {
    return res.status(403).json({ message: 'Forbidden: You do not have access to this event.' });
}

res.json({ ...event, isCreator, isInvited });
```

Bob now receives `403 Forbidden` with no event data when attempting to access Alice's event directly by ID.

---

### Fix 3 — RSVP Invitation & Duplicate Check (`server/routes/events.js`)

**Changed:** `POST /:id/rsvp` handler now validates invitation before recording RSVP, and blocks duplicate RSVPs.

```js
// AFTER — invitation check + duplicate guard
if (!event.invitedEmails.includes(req.user.email)) {
    return res.status(403).json({ message: 'Forbidden: You are not invited to this event.' });
}

if (event.rsvps.includes(req.user.id)) {
    return res.status(400).json({ message: 'You have already RSVPed to this event.' });
}

event.rsvps.push(req.user.id);
```

Bob now receives `403 Forbidden` when attempting to RSVP to an event he wasn't invited to. Invited users who RSVP twice receive `400 Bad Request`.

---

### Fix 4 — Delete Ownership Check (`server/routes/events.js`)

**Changed:** `DELETE /:id` handler now verifies the requesting user is the event creator.

```js
// AFTER — ownership check before deletion
const event = events[index];

if (event.creatorId !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden: Only the event creator can delete this event.' });
}

events.splice(index, 1);
```

Bob now receives `403 Forbidden` when attempting to delete Alice's event. The event remains intact.

---

### Fix 5 — Conditional Button Rendering (`client/src/pages/EventDetail.jsx`)

**Changed:** RSVP and Delete buttons are now conditionally rendered using `isCreator` and `isInvited` flags returned by the backend.

```jsx
// AFTER — conditional rendering based on permissions

{/* RSVP button: only for invited users who haven't RSVPed yet */}
{event.isInvited && !hasRSVPed && (
    <button onClick={handleRSVP}>RSVP for Event</button>
)}

{/* Already RSVPed confirmation */}
{event.isInvited && hasRSVPed && (
    <div>You're going!</div>
)}

{/* No access message for uninvited, non-creator users */}
{!event.isInvited && !event.isCreator && (
    <div>You are not invited to this event</div>
)}

{/* Delete button: only for the event creator */}
{event.isCreator && (
    <button onClick={handleDelete}><Trash2 /></button>
)}
```

The UI now reflects the actual permission state. Bob sees no action buttons — only a message stating he is not invited. Alice (creator) sees only the Delete button. An invited user sees the RSVP button until they RSVP, then a confirmation.

---

## Verification Summary

After all fixes, the same five actions Bob tried earlier produce the following results:

| Action | Before Fix | After Fix |
|--------|-----------|-----------|
| `GET /api/events` | Returns all events including Alice's | Returns only Bob's own events |
| `GET /api/events/<id>` (Alice's) | `200 OK` — full event data | `403 Forbidden` — no data returned |
| `POST /api/events/<id>/rsvp` | `200 OK` — RSVP recorded | `403 Forbidden` — RSVP blocked |
| `DELETE /api/events/<id>` | `200 OK` — event destroyed | `403 Forbidden` — event untouched |
| UI as Bob on Alice's event | Shows RSVP + Delete buttons | Shows "not invited" message only |

---

## Key Insight

> **Authentication answers "who are you?" — Authorisation answers "what are you allowed to do?"**

The original app only asked the first question — once. Every endpoint after login trusted the JWT completely, treating identity as permission. A valid JWT is not a master key. Each endpoint that touches private data or performs a destructive action must independently verify the requesting user's permission against the specific resource being accessed.

The four-step framework applied here:
1. **Detect** — compare `req.user.id` / `req.user.email` against `event.creatorId` / `event.invitedEmails`
2. **Respond** — return `403 Forbidden` with no data if the check fails
3. **Reflect** — update the frontend to show only the actions the user is permitted to take
4. **Handle** — the server check is the real gate; the UI check is a courtesy, not a defence
