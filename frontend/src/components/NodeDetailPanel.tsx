import { Node } from '../types/visualization'
import { X } from 'lucide-react'
import Editor from '@monaco-editor/react'

interface NodeDetailPanelProps {
  node: Node
  onClose: () => void
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const getLanguage = (lang: string): string => {
    const map: Record<string, string> = {
      python: 'python',
      javascript: 'javascript',
      typescript: 'typescript'
    }
    return map[lang] || 'plaintext'
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-800 border-l border-gray-700 shadow-xl overflow-y-auto z-50">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Code Snippet</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <span className="text-sm text-gray-400">File</span>
          <p className="font-mono text-sm break-all">{node.metadata.file_path}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
            {node.language}
          </span>
          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
            {node.code_type}
          </span>
        </div>

        {node.metadata.function_name && (
          <div>
            <span className="text-sm text-gray-400">Function</span>
            <p className="font-mono text-sm">{node.metadata.function_name}</p>
          </div>
        )}

        {node.metadata.class_name && (
          <div>
            <span className="text-sm text-gray-400">Class</span>
            <p className="font-mono text-sm">{node.metadata.class_name}</p>
          </div>
        )}

        <div>
          <span className="text-sm text-gray-400">Lines</span>
          <p className="text-sm">{node.metadata.start_line} - {node.metadata.end_line}</p>
        </div>

        <div>
          <span className="text-sm text-gray-400">Complexity</span>
          <p className="text-sm">{node.complexity} lines</p>
        </div>
      </div>

      <div className="border-t border-gray-700">
        <div className="p-2 bg-gray-900 text-xs text-gray-400">
          Code Preview
        </div>
        <Editor
          height={400}
          language={getLanguage(node.language)}
          value={node.metadata.code}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on'
          }}
        />
      </div>
    </div>
  )
}
