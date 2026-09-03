export default function Card({ title, children }) {
  return (
    <div className="rounded-lg border p-4">
      {title && <h3 className="mb-2 text-sm font-medium">{title}</h3>}
      {children}
    </div>
  )
}
