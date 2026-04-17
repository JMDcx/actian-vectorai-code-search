import { Node } from '../types/visualization'
import { X } from 'lucide-react'
import Editor from '@monaco-editor/react'

interface NodeDetailPanelProps {
  node: Node | null
  onClose: () => void
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  if (!node) return null

  const getLanguage = (lang: string): string => {
    const map: Record<string, string> = {
      python: 'python',
      javascript: 'javascript',
      typescript: 'typescript'
    }
    return map[lang] || 'plaintext'
  }

  const complexityLevel = getComplexityLevel(node.complexity)

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-950/95 backdrop-blur-xl border-l border-cyan-500/30 shadow-2xl overflow-y-auto z-50">
      {/* 赛博朋克头部 */}
      <div className="sticky top-0 z-10 bg-gray-950/95 border-b border-cyan-500/30 backdrop-blur-xl">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-cyan-400">代码详情</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 复杂度指示器 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">复杂度等级</span>
              <span className={`font-bold ${complexityLevel.color}`}>
                {complexityLevel.label}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${complexityLevel.gradient}`}
                style={{ width: `${Math.min(node.complexity, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4 space-y-4">
        {/* 元数据卡片 */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-cyan-500/20">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">元数据</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">语言</span>
              <span className={`px-2 py-1 rounded ${getLanguageBadge(node.language)}`}>
                {node.language}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">类型</span>
              <span className={`px-2 py-1 rounded ${getTypeBadge(node.code_type)}`}>
                {node.code_type}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">行数</span>
              <span className="text-white font-mono">
                {node.metadata.start_line} - {node.metadata.end_line}
              </span>
            </div>
            {node.metadata.function_name && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">函数名</span>
                <span className="text-cyan-400 font-mono text-xs truncate max-w-[200px]">
                  {node.metadata.function_name}
                </span>
              </div>
            )}
            {node.metadata.class_name && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">类名</span>
                <span className="text-purple-400 font-mono text-xs truncate max-w-[200px]">
                  {node.metadata.class_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 文件路径 */}
        <div className="bg-gray-900/50 rounded-lg p-3 border border-cyan-500/20">
          <div className="text-xs text-gray-400 mb-1">文件路径</div>
          <div className="text-xs text-gray-300 font-mono break-all">
            {node.metadata.file_path}
          </div>
        </div>

        {/* 代码预览 */}
        <div className="bg-gray-900/50 rounded-lg border border-cyan-500/20 overflow-hidden">
          <div className="px-4 py-2 bg-gray-800/50 border-b border-cyan-500/20">
            <h3 className="text-sm font-semibold text-cyan-400">代码</h3>
          </div>
          <div className="p-2">
            <Editor
              height={300}
              language={getLanguage(node.language)}
              value={node.metadata.code}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* 向量信息 */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-purple-500/20">
          <h3 className="text-sm font-semibold text-purple-400 mb-2">向量信息</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-400 text-xs">X 坐标</div>
              <div className="text-white font-mono text-xs">
                {node.x.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">Y 坐标</div>
              <div className="text-white font-mono text-xs">
                {node.y.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getComplexityLevel(complexity: number): {
  label: string
  color: string
  gradient: string
} {
  if (complexity < 10) {
    return {
      label: '简单',
      color: 'text-green-400',
      gradient: 'bg-gradient-to-r from-green-500 to-green-400'
    }
  } else if (complexity < 30) {
    return {
      label: '中等',
      color: 'text-yellow-400',
      gradient: 'bg-gradient-to-r from-yellow-500 to-yellow-400'
    }
  } else if (complexity < 50) {
    return {
      label: '复杂',
      color: 'text-orange-400',
      gradient: 'bg-gradient-to-r from-orange-500 to-orange-400'
    }
  } else {
    return {
      label: '非常复杂',
      color: 'text-red-400',
      gradient: 'bg-gradient-to-r from-red-500 to-pink-500'
    }
  }
}

function getLanguageBadge(language: string): string {
  const badges: Record<string, string> = {
    python: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    javascript: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    typescript: 'bg-green-500/20 text-green-400 border border-green-500/30',
    unknown: 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
  }
  return badges[language] || badges.unknown
}

function getTypeBadge(type: string): string {
  const badges: Record<string, string> = {
    function: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    class: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
    import: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    unknown: 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
  }
  return badges[type] || badges.unknown
}
