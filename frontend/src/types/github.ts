// frontend/src/types/github.ts
export interface GitHubImportRequest {
  url: string
}

export interface GitHubImportResponse {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message: string
}

export interface ImportTaskStatus {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  step: 'cloning' | 'parsing' | 'indexing' | null
  progress: number
  total_files?: number
  indexed_files?: number
  created_at: string
}

export interface ImportStats {
  total_snippets: number
  total_files: number
  duration_ms: number
}

export interface WebSocketMessage {
  type: 'step' | 'complete' | 'error'
  step?: 'cloning' | 'parsing' | 'indexing'
  message?: string
  progress?: number
  stats?: ImportStats
  error?: string
  details?: Record<string, any>
}

export interface ImportState {
  status: 'idle' | 'importing' | 'completed' | 'error'
  currentStep: 'cloning' | 'parsing' | 'indexing' | null
  progress: number
  error: string | null
  stats: ImportStats | null
}
