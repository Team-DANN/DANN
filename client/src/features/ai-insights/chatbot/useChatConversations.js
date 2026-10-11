// PATH: src/features/ai-insights/chatbot/useChatConversations.js
//
// Conversation threads for the assistant, shared by the floating widget and
// the DANN AI page (both read them through ChatbotContext). Talks to the
// action-taking agent service: /chat for messages and proposals, /confirm
// for the one tap that makes a proposal real.
//
// Message shape: { id, role: 'user' | 'assistant',
//   kind: 'text' | 'proposal' | 'result' | 'error', content, ... }
// `content` is always a plain string, so the thread list can preview any
// message. A proposal message also has `proposal` and `proposalStatus`
// ('pending' | 'confirming' | 'confirmed' | 'failed' | 'expired' |
// 'cancelled' | 'superseded') and an optional `proposalError`. A result
// message has `tool`, `undoable` and `result` (used by Undo, step 4c).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { confirmAction, sendChat } from '../../../lib/api/agentActions.js'
import { AgentActionsError } from '../../../lib/agentActionsClient.js'

const MAX_MESSAGE_CHARS = 2000 // the service refuses longer messages
const HISTORY_LIMIT = 10 // the service only shows the model the last 10
const DEFAULT_WAIT_SECONDS = 60 // a 429 that names no time
const RETRY_HINT = ' If it keeps failing, ask me again and I will prepare a new proposal.'

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function makeConversation() {
  return { id: makeId('c'), title: null, messages: [] }
}

function deriveTitle(conversation) {
  if (conversation.title) return conversation.title
  const firstUserMessage = conversation.messages.find((m) => m.role === 'user')
  if (!firstUserMessage) return 'New conversation'
  return firstUserMessage.content.length > 40
    ? `${firstUserMessage.content.slice(0, 40)}…`
    : firstUserMessage.content
}

// What the service gets: real user and assistant text only (replies, proposal
// texts, confirmed results). Error bubbles are not replies the model gave.
function buildHistory(messages) {
  return messages
    .filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        m.kind !== 'error' &&
        typeof m.content === 'string' &&
        m.content.trim()
    )
    .slice(-HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
}

function toAssistantMessage(data) {
  const proposal = data?.proposal ?? null
  return {
    id: makeId('a'),
    role: 'assistant',
    kind: proposal ? 'proposal' : 'text',
    content: data?.reply || "I couldn't put an answer together. Please try again.",
    proposal,
    proposalStatus: proposal ? 'pending' : null,
    proposalError: null,
  }
}

function toErrorMessage(err) {
  const content =
    err instanceof AgentActionsError
      ? err.message
      : "I couldn't reach the assistant just now. Try again in a moment."
  return { id: makeId('a'), role: 'assistant', kind: 'error', content }
}

// What a failed /confirm means for the card. The token is single use and the
// service remembers the outcome, so a tap that is simply repeated is safe: it
// either runs once or returns the same result. Only the cases where the
// service never decided anything keep the card open.
function classifyConfirmError(err) {
  if (!(err instanceof AgentActionsError)) {
    return { status: 'pending', message: "I couldn't confirm that just now. Tap Confirm again to check; it will not run twice." }
  }
  const { status, message } = err
  if (status === 410) return { status: 'expired', message: null }
  if (status === 0) {
    return {
      status: 'pending',
      message: "I couldn't reach the assistant to confirm. It may or may not have gone through. Tap Confirm again to check; it will not run twice.",
    }
  }
  if (status === 401 || status === 429) return { status: 'pending', message }
  if (status === 409 && /already being confirmed/i.test(message)) return { status: 'pending', message }
  if (status === 502 || status === 503) return { status: 'pending', message: `${message}${RETRY_HINT}` }
  return { status: 'failed', message }
}

// A wait after a 429: `seconds` counts down once a second, only while a wait
// is running.
function useCooldown() {
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!until) return undefined
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= until) setUntil(0)
    }, 1000)
    return () => clearInterval(id)
  }, [until])

  const start = useCallback((seconds) => {
    const t = Date.now()
    setNow(t)
    setUntil(t + seconds * 1000)
  }, [])

  const seconds = until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0
  return [seconds, start]
}

export function useChatConversations() {
  const [conversations, setConversations] = useState(() => [makeConversation()])
  const [activeId, setActiveId] = useState(() => conversations[0].id)
  const [isThinking, setIsThinking] = useState(false)

  // Chat and confirm have separate limits on the service, so separate waits.
  const [cooldownSeconds, startChatCooldown] = useCooldown()
  const [confirmCooldownSeconds, startConfirmCooldown] = useCooldown()

  const conversationsRef = useRef(conversations)
  const inFlightRef = useRef(false)
  const confirmingRef = useRef(new Set())

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  const activeConversation = conversations.find((c) => c.id === activeId) ?? conversations[0]

  // A new proposal replaces any earlier one still waiting in the same thread,
  // so two cards for the same request can never both be confirmed.
  const appendMessage = useCallback((conversationId, message) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c
        const earlier =
          message.kind === 'proposal'
            ? c.messages.map((m) =>
                m.proposalStatus === 'pending' ? { ...m, proposalStatus: 'superseded', proposalError: null } : m
              )
            : c.messages
        const next = { ...c, messages: [...earlier, message] }
        return { ...next, title: deriveTitle(next) }
      })
    )
  }, [])

  const updateMessage = useCallback((messageId, patch) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.messages.some((m) => m.id === messageId)
          ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)) }
          : c
      )
    )
  }, [])

  const findProposal = useCallback((messageId) => {
    const thread = conversationsRef.current.find((c) => c.messages.some((m) => m.id === messageId))
    const message = thread?.messages.find((m) => m.id === messageId)
    return thread && message?.proposal ? { threadId: thread.id, message } : null
  }, [])

  const ask = useCallback(
    async (question) => {
      const text = question.trim()
      if (!text || inFlightRef.current) return

      const threadId = activeId
      const current = conversationsRef.current.find((c) => c.id === threadId)
      const userMessage = { id: makeId('u'), role: 'user', kind: 'text', content: text }
      const history = buildHistory([...(current?.messages ?? []), userMessage])

      appendMessage(threadId, userMessage)

      if (text.length > MAX_MESSAGE_CHARS) {
        appendMessage(threadId, {
          id: makeId('a'),
          role: 'assistant',
          kind: 'error',
          content: 'That message is too long. Please keep it under 2,000 characters.',
        })
        return
      }

      inFlightRef.current = true
      setIsThinking(true)
      try {
        const data = await sendChat(history)
        appendMessage(threadId, toAssistantMessage(data))
      } catch (err) {
        if (err instanceof AgentActionsError && err.status === 429) {
          startChatCooldown(err.retryAfter ?? DEFAULT_WAIT_SECONDS)
        }
        appendMessage(threadId, toErrorMessage(err))
      } finally {
        inFlightRef.current = false
        setIsThinking(false)
      }
    },
    [activeId, appendMessage, startChatCooldown]
  )

  // The one tap that runs a proposal. Guarded twice against a double tap: the
  // set below, and the service's own single-use token.
  const confirmProposal = useCallback(
    async (messageId) => {
      if (confirmingRef.current.has(messageId)) return
      const found = findProposal(messageId)
      if (!found || found.message.proposalStatus !== 'pending' || !found.message.proposal.token) return

      const { threadId, message } = found
      confirmingRef.current.add(messageId)
      updateMessage(messageId, { proposalStatus: 'confirming', proposalError: null })

      try {
        const data = await confirmAction(message.proposal.token)
        updateMessage(messageId, { proposalStatus: 'confirmed', proposalError: null })
        appendMessage(threadId, {
          id: makeId('r'),
          role: 'assistant',
          kind: 'result',
          content: data?.reply || 'Done.',
          tool: message.proposal.tool ?? null,
          undoable: message.proposal.undoable ?? false,
          result: data?.result ?? null,
        })
      } catch (err) {
        if (err instanceof AgentActionsError && err.status === 429) {
          startConfirmCooldown(err.retryAfter ?? DEFAULT_WAIT_SECONDS)
        }
        const next = classifyConfirmError(err)
        updateMessage(messageId, { proposalStatus: next.status, proposalError: next.message })
      } finally {
        confirmingRef.current.delete(messageId)
      }
    },
    [appendMessage, findProposal, startConfirmCooldown, updateMessage]
  )

  // Nothing was sent to the service, so there is nothing to undo. The short
  // assistant line goes into the history, so the model knows it was dropped.
  const cancelProposal = useCallback(
    (messageId) => {
      const found = findProposal(messageId)
      if (!found || found.message.proposalStatus !== 'pending') return
      updateMessage(messageId, { proposalStatus: 'cancelled', proposalError: null })
      appendMessage(found.threadId, {
        id: makeId('a'),
        role: 'assistant',
        kind: 'text',
        content: 'Cancelled. Nothing was changed.',
      })
    },
    [appendMessage, findProposal, updateMessage]
  )

  const startNewConversation = useCallback(() => {
    if (activeConversation && activeConversation.messages.length === 0) return
    const fresh = makeConversation()
    setConversations((prev) => [fresh, ...prev])
    setActiveId(fresh.id)
  }, [activeConversation])

  const selectConversation = useCallback((id) => {
    setActiveId(id)
  }, [])

  // New threads are added at the front, so the list is already newest first.
  const conversationList = useMemo(
    () => conversations.map((c) => ({ ...c, title: deriveTitle(c) })),
    [conversations]
  )

  return {
    conversations: conversationList,
    activeId,
    activeMessages: activeConversation?.messages ?? [],
    isThinking,
    cooldownSeconds,
    confirmCooldownSeconds,
    ask,
    confirmProposal,
    cancelProposal,
    startNewConversation,
    selectConversation,
  }
}