// PATH: src/lib/api/ocr.js
//
// Two-service call, deliberately: classification runs on the Python
// agents service (image → match/mismatch/unclear/ambiguous), saving the
// confirmed result runs on Node (source of truth for business data).
// This is the only file that should know both of those live here —
// components call classifyImage() then saveCapture(), never the raw
// endpoints directly.
//
// classifyImage() can't use agentsFetch — that wrapper hardcodes
// application/json, but this needs multipart/form-data for the file
// upload (setting Content-Type manually on a FormData request breaks
// the browser's own boundary generation). So this one call talks to
// AGENTS_BASE_URL directly instead, matching agentsFetch's auth/error
// handling by hand.

import { apiFetch } from '../apiClient.js'
import { getToken } from '../apiClient.js'

const AGENTS_BASE_URL = import.meta.env.VITE_AGENTS_API_URL

export async function classifyImage(file, category) {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('category', category)

  const response = await fetch(`${AGENTS_BASE_URL}/api/intelligence/ocr/classify`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // No Content-Type here — the browser sets multipart/form-data
      // with the correct boundary automatically when the body is a
      // FormData instance. Setting it manually breaks the upload.
    },
    body: formData,
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.detail || body?.error || `OCR request failed (${response.status})`)
  }

  return body?.data
}

export async function saveCapture({ category, rawText, confirmedText }) {
  const res = await apiFetch('/api/ocr-captures', {
    method: 'POST',
    body: JSON.stringify({
      category,
      raw_text: rawText,
      confirmed_text: confirmedText,
    }),
  })
  return res.data
}

export async function getCaptures() {
  const res = await apiFetch('/api/ocr-captures')
  return res.data
}