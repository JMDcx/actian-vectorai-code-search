import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { NetworkGraph } from '../components/NetworkGraph'
import { NodeDetailPanel } from '../components/NodeDetailPanel'
import { GraphData, Node, VisualizationFilters } from '../types/visualization'
import axios from 'axios'

export default function VectorVisualization() {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<VisualizationFilters>({
    language: undefined,
    codeType: undefined,
    minSimilarity: undefined
  })
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
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
          <p className="text-xl">Loading vector space visualization...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <p className="text-xl text-red-400">Error: {error}</p>
          <button
            onClick={fetchGraphData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <p className="text-xl">No code snippets indexed yet.</p>
          <p className="text-gray-400">Index a codebase first to see the visualization.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <header className="p-4 border-b border-gray-800 flex items-center gap-4">
        <h1 className="text-2xl font-bold">Vector Space Visualization</h1>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search code semantics..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-sm text-gray-400">
          {graphData.nodes.length} nodes • {graphData.edges.length} edges
        </div>
      </header>

      <div className="flex-1 relative">
        {graphData && (
          <NetworkGraph
            nodes={graphData.nodes}
            edges={graphData.edges}
            selectedNode={selectedNode}
            onNodeSelect={setSelectedNode}
            highlightedNodes={highlightedNodes}
          />
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
