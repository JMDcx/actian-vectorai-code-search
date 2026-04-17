export interface Node {
  id: string
  x: number
  y: number
  language: string
  code_type: 'function' | 'class' | 'import' | 'comment'
  complexity: number
  metadata: NodeMetadata
}

export interface NodeMetadata {
  file_path: string
  code: string
  start_line: number
  end_line: number
  function_name?: string
  class_name?: string
}

export interface Edge {
  source: string
  target: string
  similarity: number
}

export interface GraphData {
  nodes: Node[]
  edges: Edge[]
}

export interface VisualizationFilters {
  language?: string
  codeType?: string
  minSimilarity?: number
}

export interface SelectedNodeState {
  node: Node | null
  position: { x: number; y: number } | null
}
