// frontend/src/hooks/useGitHubImport.ts
import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import { ImportState, ImportStats, WebSocketMessage } from '../types/github'

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

  const reset = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setState(initialState)
  }, [])

  const startImport = useCallback(async (url: string) => {
    try {
      setState({ status: 'importing', currentStep: null, progress: 0, error: null, stats: null })

      // Start import task
      const resp = await axios.post('/api/github/import', { url })
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
                currentStep: 'completed',
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

    } catch (err: any) {
      setState({
        status: 'error',
        currentStep: null,
        progress: 0,
        error: err.response?.data?.detail || 'Import failed',
        stats: null
      })
    }
  }, [])

  return { state, startImport, reset }
}
