import { useCallback, useRef, useState } from 'react'
import { mockVoiceResponses } from '../data/productionMock.js'

// Mock now, real provider later. Whatever backs this — WhisperFlow for STT,
// Claude/GPT for intent parsing — should conform to this same shape:
// startListening() -> eventually calls onResult({ transcript, productId, quantity, confidence })
// Swapping providers should never require touching the components that use this hook.

const STATUS = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PARSING: 'parsing',
  RESULT: 'result',
  ERROR: 'error',
}

export function useVoiceLogging() {
  const [status, setStatus] = useState(STATUS.IDLE)
  const [result, setResult] = useState(null)
  const cycleRef = useRef(0)

  const startListening = useCallback(() => {
    setStatus(STATUS.LISTENING)
    setResult(null)

    // Simulated mic capture window
    setTimeout(() => {
      setStatus(STATUS.PARSING)

      // Simulated STT + LLM parse latency
      setTimeout(() => {
        const canned = mockVoiceResponses[cycleRef.current % mockVoiceResponses.length]
        cycleRef.current += 1

        if (!canned.productId) {
          setStatus(STATUS.ERROR)
          return
        }

        setResult(canned)
        setStatus(STATUS.RESULT)
      }, 900)
    }, 1200)
  }, [])

  const reset = useCallback(() => {
    setStatus(STATUS.IDLE)
    setResult(null)
  }, [])

  return { status, result, startListening, reset, STATUS }
}