import { apiFetch } from './client.js'

// The ONLY file that talks to the agents/ module — everything AI-powered
// routes through here, never call agents/ endpoints from elsewhere.
export const getAnomalies = () => apiFetch('/api/intelligence/anomalies')
export const askAssistant = (message) =>
  apiFetch('/api/intelligence/assistant', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
