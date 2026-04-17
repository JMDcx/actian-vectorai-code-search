import { Node, Edge } from '../types/visualization'

interface StatsDashboardProps {
  nodes: Node[]
  edges: Edge[]
}

export function StatsDashboard({ nodes, edges }: StatsDashboardProps) {
  const stats = calculateStats(nodes, edges)

  return (
    <div className="fixed top-4 left-4 z-40 space-y-3">
      {/* 主统计卡片 */}
      <div className="bg-gray-950/95 backdrop-blur-xl rounded-lg border border-cyan-500/30 shadow-2xl p-4 min-w-[280px]">
        <h3 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          向量数据库统计
        </h3>

        <div className="space-y-3">
          {/* 总代码片段 */}
          <div className="bg-gray-900/50 rounded-lg p-3 border border-cyan-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">代码片段总数</span>
              <span className="text-2xl font-bold text-cyan-400">
                {stats.totalNodes}
              </span>
            </div>
          </div>

          {/* 语义连接 */}
          <div className="bg-gray-900/50 rounded-lg p-3 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">语义连接数</span>
              <span className="text-2xl font-bold text-purple-400">
                {stats.totalEdges}
              </span>
            </div>
          </div>

          {/* 平均相似度 */}
          <div className="bg-gray-900/50 rounded-lg p-3 border border-pink-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">平均相似度</span>
              <span className="text-2xl font-bold text-pink-400">
                {(stats.avgSimilarity * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 语义聚类统计 */}
      <div className="bg-gray-950/95 backdrop-blur-xl rounded-lg border border-cyan-500/30 shadow-2xl p-4 min-w-[280px]">
        <h3 className="text-sm font-semibold text-cyan-400 mb-3">语义聚类分析</h3>

        <div className="space-y-2">
          {stats.clusters.map((cluster) => (
            <div
              key={cluster.name}
              className="bg-gray-900/50 rounded-lg p-2 border border-cyan-500/10"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300">{cluster.name}</span>
                <span className="text-xs font-bold" style={{ color: cluster.color }}>
                  {cluster.count}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${(cluster.count / stats.totalNodes) * 100}%`,
                    backgroundColor: cluster.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 复杂度分析 */}
      <div className="bg-gray-950/95 backdrop-blur-xl rounded-lg border border-cyan-500/30 shadow-2xl p-4 min-w-[280px]">
        <h3 className="text-sm font-semibold text-cyan-400 mb-3">代码复杂度分布</h3>

        <div className="space-y-2">
          {stats.complexityDistribution.map((item) => (
            <div
              key={item.level}
              className="bg-gray-900/50 rounded-lg p-2 border border-cyan-500/10"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300">{item.level}</span>
                <span className="text-xs font-bold" style={{ color: item.color }}>
                  {item.count}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${item.gradient}`}
                  style={{ width: `${(item.count / stats.totalNodes) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function calculateStats(nodes: Node[], edges: Edge[]) {
  // 基础统计
  const totalNodes = nodes.length
  const totalEdges = edges.length
  const avgSimilarity = edges.length > 0
    ? edges.reduce((sum, edge) => sum + edge.similarity, 0) / edges.length
    : 0

  // 语义聚类统计
  const clusterMap = new Map<string, { count: number; color: string }>()

  nodes.forEach(node => {
    const key = `${node.language}-${node.code_type}`
    const existing = clusterMap.get(key)

    if (!existing) {
      clusterMap.set(key, {
        count: 1,
        color: getClusterColor(node.language, node.code_type)
      })
    } else {
      existing.count++
    }
  })

  const clusters = Array.from(clusterMap.entries())
    .map(([name, data]) => ({
      name: formatClusterName(name),
      count: data.count,
      color: data.color
    }))
    .sort((a, b) => b.count - a.count)

  // 复杂度分布
  const complexityDistribution = [
    {
      level: '简单 (<10 行)',
      count: nodes.filter(n => n.complexity < 10).length,
      color: '#22c55e',
      gradient: 'bg-gradient-to-r from-green-500 to-green-400'
    },
    {
      level: '中等 (10-30 行)',
      count: nodes.filter(n => n.complexity >= 10 && n.complexity < 30).length,
      color: '#eab308',
      gradient: 'bg-gradient-to-r from-yellow-500 to-yellow-400'
    },
    {
      level: '复杂 (30-50 行)',
      count: nodes.filter(n => n.complexity >= 30 && n.complexity < 50).length,
      color: '#f97316',
      gradient: 'bg-gradient-to-r from-orange-500 to-orange-400'
    },
    {
      level: '非常复杂 (>50 行)',
      count: nodes.filter(n => n.complexity >= 50).length,
      color: '#ef4444',
      gradient: 'bg-gradient-to-r from-red-500 to-pink-500'
    }
  ]

  return {
    totalNodes,
    totalEdges,
    avgSimilarity,
    clusters,
    complexityDistribution
  }
}

function getClusterColor(language: string, codeType: string): string {
  // 赛博朋克色彩方案
  const colors: Record<string, string> = {
    'python-function': '#00ff88',
    'python-class': '#00cc6a',
    'python-import': '#00ffcc',
    'javascript-function': '#ff00ff',
    'javascript-class': '#cc00cc',
    'javascript-import': '#ff00cc',
    'typescript-function': '#00ffff',
    'typescript-class': '#00cccc',
    'typescript-import': '#00ccff'
  }
  return colors[`${language}-${codeType}`] || '#9400d3'
}

function formatClusterName(key: string): string {
  const [language, codeType] = key.split('-')
  const typeMap: Record<string, string> = {
    function: '函数',
    class: '类',
    import: '导入'
  }
  const langMap: Record<string, string> = {
    python: 'Python',
    javascript: 'JavaScript',
    typescript: 'TypeScript'
  }
  return `${langMap[language] || language} ${typeMap[codeType] || codeType}`
}
