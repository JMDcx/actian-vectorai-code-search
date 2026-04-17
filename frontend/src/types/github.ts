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

export type WebSocketMessage =
  | { type: 'step'; step: 'cloning' | 'parsing' | 'indexing'; progress: number; message?: string }
  | { type: 'complete'; stats: ImportStats }
  | { type: 'error'; error: string; message?: string }

export interface ImportState {
  status: 'idle' | 'importing' | 'completed' | 'error'
  currentStep: 'cloning' | 'parsing' | 'indexing' | null
  progress: number
  error: string | null
  stats: ImportStats | null
}
