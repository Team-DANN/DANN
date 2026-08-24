export default function SectionHeader({ eyebrow, title, body, align = 'left' }) {
  return (
    <div className={`section-heading section-heading--${align}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {body && <p className="section-heading__body">{body}</p>}
    </div>
  )
}
