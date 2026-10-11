// PATH: src/lib/agentActionsClient.js
//
// Fetch wrapper for the action-taking agent service (agent-actions/), a
// SEPARATE service from the old Python agents service (agentsClient.js) and
// from the Node backend. Same bearer token as the rest of the app.
//
// Differences from agentsClient.js, on purpose:
//  - Responses are plain JSON, not the {success, data} envelope, so the body
//    is returned as it is.
//  - Errors are {detail}. A 429 carries a Retry-After, which the caller needs.
//  - A 401 here does NOT sign the person out; apiFetch does that on its own
//    calls. This client only reports it.

import { getToken } from './apiClient.js'

const BASE_URL = (
  import.meta.env.VITE_AGENT_ACTIONS_URL || (import.meta.env.DEV ? 'http://localhost:8001' : '')
).replace(/\/+$/, '')

// A Render cold start can take about a minute.
const TIMEOUT_MS = 90_000

export class AgentActionsError extends Error {
  constructor(message, { status = 0, retryAfter = null } = {}) {
    super(message)
    this.name = 'AgentActionsError'
    this.status = status // 0 means the service could not be reached
    this.retryAfter = retryAfter // whole seconds, or null
  }
}

// The Retry-After header is only readable cross-origin when the service lists
// it in Access-Control-Expose-Headers. Fall back to the number in the
// service's own sentence ("Try again in 12 seconds.").
function readRetryAfter(response, detail) {
  const fromHeader = Number.parseInt(response.headers.get('Retry-After') ?? '', 10)
  if (Number.isFinite(fromHeader) && fromHeader > 0) return fromHeader

  if (typeof detail === 'string') {
    const match = detail.match(/in (\d+) seconds?/i)
    if (match) return Number.parseInt(match[1], 10)
  }
  return null
}

export async function agentActionsFetch(path, options = {}) {
  if (!BASE_URL) {
    throw new AgentActionsError('The assistant is not set up for this site yet.')
  }

  const token = getToken()
  if (!token) {
    throw new AgentActionsError('Sign in to use the assistant.', { status: 401 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
  } catch {
    throw new AgentActionsError("I couldn't reach the assistant just now. Try again in a moment.")
  } finally {
    clearTimeout(timer)
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const detail = body?.detail
    const message =
      typeof detail === 'string' && detail.trim()
        ? detail
        : `The assistant returned an error (${response.status}).`
    throw new AgentActionsError(message, {
      status: response.status,
      retryAfter: response.status === 429 ? readRetryAfter(response, detail) : null,
    })
  }

  return body
}