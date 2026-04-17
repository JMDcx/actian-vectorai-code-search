import { useState, useEffect } from 'react'
import { Search, Loader2, Activity, Database, Zap } from 'lucide-react'
import { NetworkGraph } from '../components/NetworkGraph'
import { NodeDetailPanel } from '../components/NodeDetailPanel'
import { StatsDashboard } from '../components/StatsDashboard'
import { GraphData, Node } from '../types/visualization'
import axios from 'axios'

export default function VectorVisualization() {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGraphData()
  }, [])

  const fetchGraphData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get<GraphData>('/api/visualization/graph-data?limit=200')
      setGraphData(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load visualization')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // TODO: Implement search highlighting via backend
    setHighlightedNodes(new Set())
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-4">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-cyan-400" />
            <div className="absolute inset-0 h-16 w-16 animate-ping mx-auto rounded-full bg-cyan-400/20" />
          </div>
          <p className="text-xl text-cyan-400 font-semibold">加载向量空间可视化...</p>
          <p className="text-sm text-gray-400">Actian VectorAI DB 正在计算语义相似度</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-4">
          <p className="text-xl text-red-400">错误: {error}</p>
          <button
            onClick={fetchGraphData}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-semibold transition-all shadow-lg shadow-cyan-500/20"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-4">
          <Database className="h-16 w-16 mx-auto text-gray-600" />
          <p className="text-xl text-gray-300">暂无索引的代码片段</p>
          <p className="text-gray-400">请先索引代码库以查看可视化效果</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* 赛博朋克头部 */}
      <header className="p-4 border-b border-cyan-500/30 bg-gray-950/95 backdrop-blur-xl flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="h-8 w-8 text-cyan-400" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-cyan-400 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              代码语义可视化
            </h1>
            <p className="text-xs text-gray-400">Actian VectorAI DB 驱动</p>
          </div>
        </div>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="搜索代码语义..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all text-white placeholder-gray-400"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-cyan-500/20 rounded-lg">
            <Database className="h-4 w-4 text-cyan-400" />
            <span className="text-sm text-gray-300">
              {graphData.nodes.length} 个节点
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-purple-500/20 rounded-lg">
            <Zap className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-gray-300">
              {graphData.edges.length} 条连接
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 relative">
        {graphData && (
          <>
            <StatsDashboard nodes={graphData.nodes} edges={graphData.edges} />
            <NetworkGraph
              nodes={graphData.nodes}
              edges={graphData.edges}
              selectedNode={selectedNode}
              onNodeSelect={setSelectedNode}
              highlightedNodes={highlightedNodes}
            />
          </>
        )}
      </div>

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}
