# Changes.md — Orderly Dashboard UX States

## Deployment URL

> 🌐 **Live Deployment:** https://orderly-dashboard-ux-statess.vercel.app/

---

## 1 · What the Original Dashboard Did

The `OrdersDashboard` component (in `src/components/OrdersDashboard.jsx`) **fetched order data correctly** — the `fetchOrders` call, state variables (`loading`, `error`, `orders`), and retry logic were all wired up. However, the `<tbody>` section was entirely replaced by a static placeholder block that:

- Printed raw JSON (`{ loading, error, ordersCount }`) into a `<pre>` tag
- Showed the same dashed-border TODO box regardless of whether data was loading, loaded, or failed
- Never called `SkeletonRow`, `OrderRow`, `EmptyState`, or `ErrorState` — all of which were already defined in the file but unused

Additionally, the three sub-components that *were* provided (`EmptyState`, `ErrorState`) were stubs:
- `EmptyState` contained placeholder text ("Write a helpful message here…") and no CTA
- `ErrorState` always showed "Error message goes here" and "Something went wrong" — ignoring the real `message` prop entirely

---

## 2 · UX States That Were Missing or Broken

| State | Status | Problem |
|-------|--------|---------|
| **Loading** | ❌ Missing | `SkeletonRow` existed but was never rendered. Users saw a raw JSON dump while data was fetching. |
| **Success** | ❌ Missing | `OrderRow` existed but was never rendered. Real data never appeared in the table. |
| **Empty** | ⚠️ Stub | `EmptyState` rendered but showed literal placeholder copy, no icon with meaning, and no CTA. |
| **Error** | ⚠️ Broken | `ErrorState` showed a hardcoded "Something went wrong" and ignored the `message` prop entirely. |

**Why each missing state creates a real problem:**

- **No Loading state** → Users click Refresh and see nothing change. They don't know if the app is working. They may click Refresh multiple times, flood the API, or assume the page is broken.
- **No Success state** → The core purpose of the dashboard — viewing orders — was completely non-functional. Operations teams could not do their job.
- **Broken Empty state** → When a new account has zero orders, users see unprofessional placeholder copy. They have no guidance on what to do next.
- **Broken Error state** → "Something went wrong" gives no information. Support teams cannot diagnose issues, and users cannot take any action to recover.

---

## 3 · What Was Implemented for Each State

### ① Loading State

**Location:** Rendered inside `<tbody>` when `loading === true`

```jsx
{loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
```

- Renders **6 animated shimmer rows** that exactly mirror the column widths of the real `OrderRow` layout
- The skeleton also appears in the **stat cards** (Total Revenue, Delivered, Needs Attention) — those values show a shimmer block instead of `—`
- Uses the existing `shimmer` CSS keyframe animation already defined in the file
- Smooth `fadeIn` transition when content replaces skeletons

**User experience:** The user immediately sees the *shape* of the content. They know the page is working and data is on its way.

---

### ② Success State

**Location:** Rendered inside `<tbody>` when `!loading && !error && visibleOrders.length > 0`

```jsx
{!loading && !error && visibleOrders.map(order => (
  <OrderRow key={order.id} order={order} />
))}
```

The `OrderRow` component was enhanced with:

- **Priority flag (★ VIP badge):** Orders with `amount >= 10,000` receive a highlighted badge so operations staff can instantly spot high-value orders.
- **Status badge:** Coloured dot + text badge for each of the five statuses (Delivered, Shipped, Processing, Pending, Cancelled).
- **Hover highlight:** Smooth `background` transition on mouse enter/leave.

**Summary metrics** (stat cards) are fully wired and display:
- Total Revenue (excluding Cancelled orders)
- Delivered count
- Needs Attention count (Pending + Processing)

**Status filter pills** appear in the table toolbar, allowing users to filter by status. This integrates the `activeFilter` state, which feeds the `EmptyState` scenario 2.

**Columns displayed:** Order ID · Customer Name · Product · Amount · Status · Date

---

### ③ Empty State

**Location:** Rendered when `!loading && !error && visibleOrders.length === 0`

The `EmptyState` component handles **two distinct scenarios**:

#### Scenario A — No orders exist at all (`activeFilter` is `null`)
- Icon: 📭 inside a warm amber-tinted circle
- Heading: "No orders yet"
- Message: Explains that orders appear here in real-time once processed
- CTA: **"+ Create First Order"** button in accent colour

#### Scenario B — Orders exist but none match the active filter
- Icon: 🔍 inside a blue-tinted circle
- Heading: `No orders match "${activeFilter}"`
- Message: Tells the user to adjust or remove their filter
- CTA: **"✕ Clear Filter"** button that calls `setActiveFilter(null)`

Both scenarios use a `fadeIn` animation for a smooth appearance.

---

### ④ Error State

**Location:** Rendered when `!loading && error`

```jsx
{!loading && error && <ErrorState message={error} onRetry={loadOrders} />}
```

The `ErrorState` component **detects the error type** from the message string and returns a specific heading, icon, detail, and action for each case:

| Error pattern | Icon | Heading | Colour |
|---------------|------|---------|--------|
| `503` / `service unavailable` | 🔌 | Service temporarily unavailable | Red |
| `404` / `not found` | 🗺️ | Orders endpoint not found | Purple |
| `401` / `403` / `unauthorized` / `forbidden` | 🔐 | Access denied | Amber |
| `network` / `fetch` / `timeout` | 📡 | Network error | Blue |
| Any other message | ⚠️ | Failed to load orders | Red |

The **Retry button** calls `onRetry` (which is `loadOrders`), resetting all state and re-fetching. The button uses the same hue as the error type for visual coherence.

Critically, the **real error message is always displayed** — never a generic fallback string.

---

## 4 · How the Solution Improves the User Experience

| User Persona | Before | After |
|---|---|---|
| **Operations Manager** | Saw a raw JSON dump; couldn't view any orders | Full sortable/filterable table with revenue summary and priority flags |
| **Warehouse Staff** | Couldn't tell if the page was loading or broken | Clear skeleton UI during fetch; order rows appear with status badges |
| **Customer Service Rep** | Empty table on error with no guidance | Specific error type displayed with an actionable message and one-click Retry |

### Technical improvements
- Each of the four states is rendered by its own **isolated component**, making future changes easy and testable independently
- State transitions include **`fadeIn` animation** (0.3 s ease) so the UI never "snaps" abruptly
- The filter system integrates with the Empty state so both "no data" and "filtered no results" paths are handled without duplicating logic
- No new dependencies were introduced — the solution uses only the existing React + Vite setup and the CSS variables already defined in `index.css`

---

## 5 · How to Test Each State

Open `src/mockApi.js` and change the `SIMULATE` constant:

```js
export const SIMULATE = 'loading'   // ① Loading state  — hangs indefinitely
export const SIMULATE = 'success'   // ② Success state  — 8 orders
export const SIMULATE = 'empty'     // ③ Empty state    — 0 orders
export const SIMULATE = 'error'     // ④ Error state    — 503 error
```

To test the **"no filter match" empty state**: set `SIMULATE = 'success'`, load the app, then click any status filter pill that has zero matching orders (e.g., click "Cancelled" — only one order is cancelled, but filtering for a status with 0 results triggers Scenario B).
