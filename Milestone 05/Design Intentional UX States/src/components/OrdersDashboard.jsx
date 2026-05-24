// OrdersDashboard.jsx — Orderly B2B Order Management Platform
//
// Implements all four intentional UX states:
//   LOADING  → Animated skeleton rows that mirror the real layout
//   SUCCESS  → Full order table with summary metrics
//   EMPTY    → Context-aware messaging for two scenarios (no orders / filtered)
//   ERROR    → Specific error messages with actionable retry

import { useState, useEffect } from 'react'
import { fetchOrders } from '../mockApi'

// ─────────────────────────────────────────────
//  SUB-COMPONENTS
// ─────────────────────────────────────────────

/** Shimmer skeleton row — mirrors the real OrderRow layout */
function SkeletonRow() {
  return (
    <tr>
      {[40, 130, 180, 90, 80, 90].map((w, i) => (
        <td key={i} style={{ padding: '16px 20px' }}>
          <div style={{
            width: w, height: 13, borderRadius: 6,
            background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        </td>
      ))}
    </tr>
  )
}

/** Renders a single order row with status badge + hover highlight */
function OrderRow({ order }) {
  const STATUS_CONFIG = {
    Delivered:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  dot: '#10b981' },
    Shipped:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  dot: '#3b82f6' },
    Processing: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b' },
    Pending:    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', dot: '#8b5cf6' },
    Cancelled:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  dot: '#ef4444' },
  }
  const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending
  const isPriority = order.amount >= 10000

  return (
    <tr
      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Order ID */}
      <td style={{ padding: '15px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isPriority && (
            <span title="High-value order" style={{
              fontSize: 10, background: 'rgba(245,158,11,0.18)', color: 'var(--accent)',
              border: '1px solid rgba(245,158,11,0.35)', borderRadius: 4,
              padding: '2px 5px', fontWeight: 700, letterSpacing: '0.04em',
            }}>★ VIP</span>
          )}
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
            {order.id}
          </span>
        </div>
      </td>

      {/* Customer Name */}
      <td style={{ padding: '15px 20px', color: 'var(--text-primary)', fontWeight: 500 }}>
        {order.customer}
      </td>

      {/* Product */}
      <td style={{ padding: '15px 20px', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {order.product}
      </td>

      {/* Amount */}
      <td style={{ padding: '15px 20px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--mono)', fontSize: 13 }}>
        ₹{order.amount.toLocaleString()}
      </td>

      {/* Status badge */}
      <td style={{ padding: '15px 20px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: s.bg, color: s.color,
          padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
          {order.status}
        </span>
      </td>

      {/* Date */}
      <td style={{ padding: '15px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
        {order.date}
      </td>
    </tr>
  )
}

/**
 * EmptyState — context-aware messaging for two scenarios:
 *   1. activeFilter is set → no orders match the current filter
 *   2. No filter → the system genuinely has no orders yet
 */
function EmptyState({ activeFilter, onClearFilter }) {
  const isFiltered = Boolean(activeFilter)

  return (
    <tr>
      <td colSpan={6}>
        <div style={{
          padding: '72px 32px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 16, textAlign: 'center',
          animation: 'fadeIn 0.3s ease',
        }}>
          {/* Illustrated icon */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: isFiltered ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${isFiltered ? 'rgba(59,130,246,0.25)' : 'rgba(245,158,11,0.25)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, marginBottom: 4,
          }}>
            {isFiltered ? '🔍' : '📭'}
          </div>

          {/* Heading */}
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            {isFiltered
              ? `No orders match "${activeFilter}"`
              : 'No orders yet'}
          </div>

          {/* Explanatory message */}
          <div style={{ color: 'var(--text-secondary)', maxWidth: 340, lineHeight: 1.7, fontSize: 14 }}>
            {isFiltered
              ? 'Try adjusting or removing your active filter. Orders for other statuses may be available.'
              : 'Once your team processes the first order, it will appear here. Orders are updated in real-time.'}
          </div>

          {/* CTA button */}
          {isFiltered ? (
            <button
              onClick={onClearFilter}
              style={{
                marginTop: 8, padding: '10px 22px',
                background: 'var(--blue)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              ✕ Clear Filter
            </button>
          ) : (
            <button
              style={{
                marginTop: 8, padding: '10px 22px',
                background: 'var(--accent)', color: '#000',
                border: 'none', borderRadius: 'var(--radius)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              + Create First Order
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

/**
 * ErrorState — derives a specific, actionable message from the error text
 * rather than showing a generic "Something went wrong."
 */
function ErrorState({ message, onRetry }) {
  // Map known error patterns to user-friendly explanations + actions
  const getErrorInfo = (msg = '') => {
    if (msg.includes('503') || msg.toLowerCase().includes('service unavailable')) {
      return {
        icon: '🔌',
        heading: 'Service temporarily unavailable',
        detail: 'The orders service is down (503). Our team has been notified.',
        action: 'Try again in a few minutes or contact support if this persists.',
        color: 'var(--red)',
        bg: 'rgba(239,68,68,0.08)',
        border: 'rgba(239,68,68,0.25)',
      }
    }
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      return {
        icon: '🗺️',
        heading: 'Orders endpoint not found',
        detail: 'The server returned a 404 error. The API route may have changed.',
        action: 'Verify the API configuration or contact your backend team.',
        color: 'var(--purple)',
        bg: 'rgba(139,92,246,0.08)',
        border: 'rgba(139,92,246,0.25)',
      }
    }
    if (msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('forbidden')) {
      return {
        icon: '🔐',
        heading: 'Access denied',
        detail: 'Your session may have expired or you lack permissions to view orders.',
        action: 'Log out and log back in. If the issue continues, contact your admin.',
        color: 'var(--accent)',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.25)',
      }
    }
    if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('timeout')) {
      return {
        icon: '📡',
        heading: 'Network error',
        detail: 'Unable to reach the orders server. Check your internet connection.',
        action: 'Ensure you are connected to the internet, then retry.',
        color: 'var(--blue)',
        bg: 'rgba(59,130,246,0.08)',
        border: 'rgba(59,130,246,0.25)',
      }
    }
    // Fallback — still shows the real error message, not "Something went wrong"
    return {
      icon: '⚠️',
      heading: 'Failed to load orders',
      detail: msg || 'An unexpected error occurred while fetching order data.',
      action: 'Retry the request. If the issue persists, contact support.',
      color: 'var(--red)',
      bg: 'rgba(239,68,68,0.08)',
      border: 'rgba(239,68,68,0.25)',
    }
  }

  const info = getErrorInfo(message)

  return (
    <tr>
      <td colSpan={6}>
        <div style={{
          margin: 28, borderRadius: 'var(--radius-lg)',
          background: info.bg, border: `1px solid ${info.border}`,
          padding: '40px 32px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 12, textAlign: 'center',
          animation: 'fadeIn 0.3s ease',
        }}>
          {/* Error icon */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--surface-2)', border: `1px solid ${info.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 4,
          }}>
            {info.icon}
          </div>

          {/* Heading */}
          <div style={{ fontSize: 17, fontWeight: 700, color: info.color }}>
            {info.heading}
          </div>

          {/* Specific error detail */}
          <div style={{
            color: 'var(--text-secondary)', fontSize: 13,
            fontFamily: 'var(--mono)', maxWidth: 380, lineHeight: 1.6,
          }}>
            {info.detail}
          </div>

          {/* Actionable guidance */}
          <div style={{
            color: 'var(--text-muted)', fontSize: 13, maxWidth: 340, lineHeight: 1.6,
          }}>
            {info.action}
          </div>

          {/* Retry button */}
          <button
            onClick={onRetry}
            style={{
              marginTop: 8, padding: '10px 26px',
              background: info.color, color: '#fff',
              border: 'none', borderRadius: 'var(--radius)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            ↻ Retry
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────
//  MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────

export default function OrdersDashboard() {
  const [orders,       setOrders]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [activeFilter, setActiveFilter] = useState(null) // e.g. 'Delivered'

  const loadOrders = () => {
    setLoading(true)
    setError(null)
    setOrders([])

    fetchOrders()
      .then(data => {
        setOrders(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => { loadOrders() }, [])

  // ── Derived stats (only computed when orders exist) ──
  const totalRevenue  = orders.reduce((s, o) => s + (o.status !== 'Cancelled' ? o.amount : 0), 0)
  const delivered     = orders.filter(o => o.status === 'Delivered').length
  const pending       = orders.filter(o => o.status === 'Pending' || o.status === 'Processing').length

  // ── Status breakdown for the filter pills ──
  const STATUS_LABELS = ['All', 'Delivered', 'Shipped', 'Processing', 'Pending', 'Cancelled']

  // ── Filtered view ──
  const visibleOrders = activeFilter
    ? orders.filter(o => o.status === activeFilter)
    : orders

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px' }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 38, height: 38, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Orders</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Manage and track all customer orders in one place.</p>
        </div>
        <button
          onClick={loadOrders}
          style={{
            padding: '10px 20px', background: 'var(--accent)', color: '#000',
            border: 'none', borderRadius: 'var(--radius)', fontSize: 14,
            fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Revenue',   value: loading ? '—' : `₹${totalRevenue.toLocaleString()}`, icon: '💰', color: 'var(--accent)'  },
          { label: 'Delivered',       value: loading ? '—' : delivered,                            icon: '✅', color: 'var(--green)'  },
          { label: 'Needs Attention', value: loading ? '—' : pending,                              icon: '⏳', color: 'var(--purple)' },
        ].map((card, i) => (
          <div key={i} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '24px 28px',
            transition: 'border-color 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{card.label}</span>
              <span style={{ fontSize: 20 }}>{card.icon}</span>
            </div>
            {/* Skeleton shimmer for stat values while loading */}
            {loading ? (
              <div style={{
                height: 32, width: 100, borderRadius: 6,
                background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }} />
            ) : (
              <div style={{ fontSize: 30, fontWeight: 700, color: card.color, fontFamily: 'var(--mono)' }}>
                {card.value}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── ORDERS TABLE ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

        {/* Table toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Recent Orders
            {!loading && !error && (
              <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>
                {visibleOrders.length} {visibleOrders.length === 1 ? 'order' : 'orders'}
                {activeFilter && ` — filtered by ${activeFilter}`}
              </span>
            )}
          </h2>

          {/* Status filter pills — only shown on success */}
          {!loading && !error && orders.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUS_LABELS.map(label => {
                const isActive = label === 'All' ? !activeFilter : activeFilter === label
                return (
                  <button
                    key={label}
                    onClick={() => setActiveFilter(label === 'All' ? null : label)}
                    style={{
                      padding: '5px 12px', fontSize: 12, fontWeight: 600,
                      borderRadius: 20, cursor: 'pointer',
                      border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                      background: isActive ? 'var(--accent-dim)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Order ID', 'Customer', 'Product', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '12px 20px',
                    fontSize: 11, fontWeight: 600,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>

              {/* ═══════════════════════════════════════════
               *  THE FOUR UX STATES
               * ═══════════════════════════════════════════ */}

              {/* ① LOADING — shimmer skeleton rows */}
              {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

              {/* ② ERROR — specific message + retry */}
              {!loading && error && (
                <ErrorState message={error} onRetry={loadOrders} />
              )}

              {/* ③ EMPTY — context-aware (no orders vs filtered) */}
              {!loading && !error && visibleOrders.length === 0 && (
                <EmptyState
                  activeFilter={activeFilter}
                  onClearFilter={() => setActiveFilter(null)}
                />
              )}

              {/* ④ SUCCESS — real order rows */}
              {!loading && !error && visibleOrders.map(order => (
                <OrderRow key={order.id} order={order} />
              ))}

            </tbody>
          </table>
        </div>
      </div>

      {/* Global keyframe animations */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
