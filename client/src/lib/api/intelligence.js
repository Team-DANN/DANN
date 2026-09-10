// PATH: src/lib/api/intelligence.js
//
// The ONLY file that talks to the Python agents service — everything
// AI-powered routes through here, never call agentsFetch directly from
// elsewhere. Matches the real FastAPI routes in routes/intelligence_routes.py.

import { agentsFetch } from '../agentsClient.js'

export const getInsights = () => agentsFetch('/api/intelligence/insights')

export const askAssistant = (message) =>
  agentsFetch('/api/intelligence/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })