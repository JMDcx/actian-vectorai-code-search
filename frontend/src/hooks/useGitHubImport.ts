// frontend/src/hooks/useGitHubImport.ts
import { useState, useCallback, useEffect, useRef } from 'react'
import { ImportState, WebSocketMessage } from '../types/github'
import { api } from '../services/api'

const initialState: ImportState = {
  status: 'idle',
  currentStep: null,
  progress: 0,
  error: null,
  stats: null
}

export function useGitHubImport() {
  const [state, setState] = useState<ImportState>(initialState)
  const wsRef = useRef<WebSocket | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  const reset = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setState(initialState)
  }, [])

  const startImport = useCallback(async (url: string) => {
    // Close any existing WebSocket before starting new import
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    try {
      setState({ status: 'importing', currentStep: null, progress: 0, error: null, stats: null })

      // Start import task
      const resp = await api.post('/api/github/import', { url })
      const taskId = resp.data.task_id

      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws/github/import/${taskId}`

      // Connect WebSocket
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data)

          switch (msg.type) {
            case 'step':
              setState(s => ({
                ...s,
                currentStep: msg.step || null,
                progress: msg.progress || s.progress
              }))
              break
            case 'complete':
              setState({
                status: 'completed',
                currentStep: null,
                progress: 100,
                error: null,
                stats: msg.stats || null
              })
              ws.close()
              break
            case 'error':
              setState({
                status: 'error',
                currentStep: null,
                progress: 0,
                error: msg.message || 'Import failed',
                stats: null
              })
              ws.close()
              break
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = () => {
        setState(s => ({
          ...s,
          status: 'error',
          error: 'Connection interrupted, please retry'
        }))
        ws.close()
      }

      ws.onclose = () => {
        setState(s => {
          if (s.status === 'importing') {
            return {
              ...s,
              status: 'error',
              error: 'Connection closed'
            }
          }
          return s
        })
      }

    } catch (err: unknown) {
      let errorMessage = 'Import failed'
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } }
        errorMessage = axiosError.response?.data?.detail || errorMessage
      }
      setState({
        status: 'error',
        currentStep: null,
        progress: 0,
        error: errorMessage,
        stats: null
      })
    }
  }, [])

  return { state, startImport, reset }
}
