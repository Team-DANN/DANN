// PATH: src/lib/agentsClient.js
//
// Fetch wrapper for the Python agents service (Tier 2: insights + chat) —
// a SEPARATE origin from the Node backend, so this does NOT reuse
// apiFetch/client.js. Same bearer-token source as the rest of the app
// (getToken from apiClient.js) since both services trust the same JWT.

import { getToken } from './apiClient.js'

const AGENTS_BASE_URL = import.meta.env.VITE_AGENTS_API_URL

export async function agentsFetch(path, options = {}) {
  const token = getToken()

  const response = await fetch(`${AGENTS_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    // FastAPI's own error responses (401 from our JWT check, validation
    // errors) use {"detail": "..."}, not our {"success","data"} envelope —
    // handle both shapes rather than assuming one.
    throw new Error(body?.detail || body?.error || `Agents request failed (${response.status})`)
  }

  return body?.data
}