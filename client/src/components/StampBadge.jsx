export default function StampBadge({ children, tone = 'neutral' }) {
  // Small status badge reused across inventory/orders/production views.
  return <span data-tone={tone}>{children}</span>
}
