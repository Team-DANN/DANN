// PATH: src/features/ai-insights/chatbot/messages/formatReply.js
//
// The model writes a small Markdown subset: **bold**, *italic*, "- " bullet
// lines and "1. " numbered lines. This turns that text into blocks the
// bubbles can draw, so the stars and dashes never show raw. No library, and
// nothing here ever produces HTML: the components render plain React nodes.

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/

// "a **b** c" -> [{ text: "a " }, { text: "b", bold: true }, { text: " c" }]
export function parseInline(text) {
  const parts = []
  const pattern = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g
  let last = 0
  let match
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    if (match[1] !== undefined) parts.push({ text: match[1], bold: true })
    else parts.push({ text: match[2], italic: true })
    last = pattern.lastIndex
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

// -> [{ type: 'p', text } | { type: 'ul' | 'ol', items: [string] }]
export function parseBlocks(text) {
  const blocks = []
  let current = null

  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.replace(/\s+$/, '')
    const bullet = line.match(BULLET)
    const numbered = bullet ? null : line.match(NUMBERED)

    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol'
      if (current?.type !== type) {
        current = { type, items: [] }
        blocks.push(current)
      }
      current.items.push((bullet ?? numbered)[1])
    } else if (line.trim() === '') {
      current = null
    } else if (current?.type === 'p') {
      current.lines.push(line.trim())
    } else {
      current = { type: 'p', lines: [line.trim()] }
      blocks.push(current)
    }
  }

  return blocks.map((b) => (b.type === 'p' ? { type: 'p', text: b.lines.join('\n') } : b))
}