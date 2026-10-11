// PATH: src/lib/api/agentActions.js
//
// The ONLY file that talks to the action-taking agent service. Matches the
// real FastAPI routes in agent-actions/app.py. (intelligence.js stays the
// door to the OLD agents service: insights and the DANN AI page preview.)

import { agentActionsFetch } from '../agentActionsClient.js'

// messages: [{ role: 'user' | 'assistant', content }], last one from the user.
// Returns { reply, model, usage, tools_used, proposal? }.
export const sendChat = (messages) =>
  agentActionsFetch('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  })

// token: the signed token from a proposal. Returns { ok, reply, result, repeat? }.
export const confirmAction = (token) =>
  agentActionsFetch('/confirm', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })