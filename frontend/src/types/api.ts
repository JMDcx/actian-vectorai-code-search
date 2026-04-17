export interface CodeSnippet {
  id: string
  file_path: string
  language: string
  code_type: string
  code: string
  start_line: number
  end_line: number
  metadata: CodeSnippetMetadata
}

export interface CodeSnippetMetadata {
  function_name?: string
  class_name?: string
  parameters?: string[]
  returns?: string
  dependencies?: string[]
  decorators?: string[]
}

export interface SearchResult {
  snippet: CodeSnippet
  similarity_score: number
  explanation: string
}

export interface SearchRequest {
  query: string
  limit?: number
  threshold?: number
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  total_results: number
  execution_time_ms: number
}

export interface IndexRequest {
  path: string
  recursive?: boolean
  file_patterns?: string[]
}

export interface IndexResponse {
  indexed_files: number
  total_snippets: number
  errors: string[]
}
