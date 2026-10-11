// PATH: src/features/ai-insights/chatbot/messages/MessageText.jsx

import { useMemo } from 'react'
import { parseBlocks, parseInline } from './formatReply.js'

function Inline({ text }) {
  return parseInline(text).map((part, i) => {
    if (part.bold) return <strong key={i} className="font-semibold">{part.text}</strong>
    if (part.italic) return <em key={i}>{part.text}</em>
    return <span key={i}>{part.text}</span>
  })
}

// An assistant reply: paragraphs keep their line breaks, "- " lines become a
// list, **bold** is bold. Plain React nodes only, never raw HTML.
export default function MessageText({ text }) {
  const blocks = useMemo(() => parseBlocks(text), [text])

  return (
    <div className="flex flex-col gap-2 break-words">
      {blocks.map((block, i) => {
        if (block.type === 'p') {
          return (
            <p key={i} className="whitespace-pre-line">
              <Inline text={block.text} />
            </p>
          )
        }
        const List = block.type === 'ol' ? 'ol' : 'ul'
        return (
          <List
            key={i}
            className={`flex flex-col gap-0.5 pl-5 ${block.type === 'ol' ? 'list-decimal' : 'list-disc'}`}
          >
            {block.items.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))}
          </List>
        )
      })}
    </div>
  )
}