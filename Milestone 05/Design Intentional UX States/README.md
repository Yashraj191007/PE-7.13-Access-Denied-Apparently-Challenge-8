# Orderly — Orders Dashboard (UX States Implementation)

> 🌐 **Live Demo:** https://orderly-dashboard-ux-statess.vercel.app/

A B2B order management dashboard with all four intentional UX states fully implemented.

---

## ✅ Implemented UX States

| State | Trigger | What's shown |
|---|---|---|
| **① Loading** | Data is being fetched | 6 animated shimmer skeleton rows + skeleton stat cards |
| **② Success** | Orders loaded | Full table with Order ID, Customer, Product, Amount, Status, Date + ★ VIP flag + filter pills |
| **③ Empty** | No orders / filter has no matches | Context-aware message with CTA (Create Order or Clear Filter) |
| **④ Error** | API call fails | Specific error type detected (503 / 404 / 401 / network) with actionable guidance + Retry |

---

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Testing Each State

Open `src/mockApi.js` and change the `SIMULATE` constant:

```js
export const SIMULATE = 'loading'   // ① skeleton rows — infinite hang
export const SIMULATE = 'success'   // ② 8 real orders load
export const SIMULATE = 'empty'     // ③ empty state with CTA
export const SIMULATE = 'error'     // ④ 503 error with retry
```

To test the **filtered empty state**: set `'success'`, load the app, then click a status filter pill that matches zero orders.

---

## What Was Fixed

The original `<tbody>` rendered a single hardcoded placeholder that dumped raw JSON to a `<pre>` tag regardless of state. See [`Changes.md`](./Changes.md) for the full analysis and implementation details.

---

## Project Structure

```
src/
├── components/
│   └── OrdersDashboard.jsx   ← all four UX states implemented here
├── mockApi.js                ← change SIMULATE to test each state
├── App.jsx
└── index.css
Changes.md                    ← full documentation of changes made
```
