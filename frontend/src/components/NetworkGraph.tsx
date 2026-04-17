import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { Node, Edge } from '../types/visualization'

interface NetworkGraphProps {
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  onNodeSelect: (node: Node) => void
  highlightedNodes: Set<string>
}

export function NetworkGraph({
  nodes,
  edges,
  selectedNode,
  onNodeSelect,
  highlightedNodes
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<Node, undefined> | null>(null)

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // 赛博朋克背景网格
    createCyberBackground(svg, width, height)

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Edge>(edges)
        .id((d: any) => d.id)
        .distance((d: any) => 150 - d.similarity * 50) // 动态距离，相似度越高越近
        .strength(0.3)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<Node>()
        .radius((d: any) => getNodeSize(d) * 1.5)
      )
      .force('cluster', createClusterForce(nodes)) // 语义聚类力

    simulationRef.current = simulation

    const g = svg.append('g')
      .style('filter', 'url(#glow)') // 添加发光效果

    // 定义发光滤镜
    const defs = svg.append('defs')
    createGlowFilter(defs)
    createGradientLink(defs)

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    svg.call(zoom)

    // 创建连接线（带渐变和动画）
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', d => getEdgeGradient(d.similarity))
      .attr('stroke-width', d => getEdgeWidth(d.similarity))
      .attr('stroke-opacity', 0.6)
      .style('filter', 'url(#link-glow)')

    // 添加数据流动画
    link.append('animate')
      .attr('attributeName', 'stroke-opacity')
      .attr('values', '0.3;0.8;0.3')
      .attr('dur', `${3 + Math.random() * 2}s`)
      .attr('repeatCount', 'indefinite')

    // 创建节点组
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
      .style('cursor', 'pointer')
      .call((d3.drag<SVGGElement, Node>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
      ) as any)

    // 创建炫酷节点效果
    node.each(function(d) {
      const nodeGroup = d3.select(this)
      const size = getNodeSize(d)
      const complexity = d.complexity || 1

      // 外层光晕
      nodeGroup.append('circle')
        .attr('r', size * 1.5)
        .attr('fill', 'none')
        .attr('stroke', getNodeColor(d))
        .attr('stroke-width', 1)
        .attr('opacity', 0.3)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('values', `${size * 1.5};${size * 2};${size * 1.5}`)
        .attr('dur', `${2 + complexity / 10}s`)
        .attr('repeatCount', 'indefinite')

      // 主体形状（根据复杂度变化）
      if (d.code_type === 'class') {
        // 类：六边形
        createHexagon(nodeGroup as any, size, getNodeColor(d))
      } else if (d.code_type === 'function') {
        // 函数：圆形
        nodeGroup.append('circle')
          .attr('r', size)
          .attr('fill', getNodeColor(d))
          .attr('opacity', 0.9)
          .style('filter', 'url(#node-glow)')
      } else {
        // 其他：菱形
        createDiamond(nodeGroup as any, size, getNodeColor(d))
      }

      // 复杂度指示器（中心点）
      if (complexity > 20) {
        nodeGroup.append('circle')
          .attr('r', 3)
          .attr('fill', '#fff')
          .attr('opacity', 0.8)
      }

      // 扫描效果
      nodeGroup.append('circle')
        .attr('r', size * 0.5)
        .attr('fill', 'none')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('opacity', 0)
        .append('animate')
        .attr('attributeName', 'stroke-opacity')
        .attr('values', '0;1;0')
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite')
    })

    // 悬停效果
    node.on('mouseenter', function(_event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('transform', `translate(${d.x ?? 0},${d.y ?? 0}) scale(1.3)`)

      // 高亮相关节点
      highlightConnectedNodes(d.id)
    })
    .on('mouseleave', function(_event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('transform', `translate(${d.x ?? 0},${d.y ?? 0}) scale(1)`)

      // 清除高亮
      clearHighlight()
    })
    .on('click', (_event, d) => {
      onNodeSelect(d)
    })

    // 更新位置
    simulation.on('tick', () => {
      link
        .attr('x1', d => {
          const source = typeof d.source === 'string' ? nodes.find(n => n.id === d.source) : d.source as Node
          return source?.x ?? 0
        })
        .attr('y1', d => {
          const source = typeof d.source === 'string' ? nodes.find(n => n.id === d.source) : d.source as Node
          return source?.y ?? 0
        })
        .attr('x2', d => {
          const target = typeof d.target === 'string' ? nodes.find(n => n.id === d.target) : d.target as Node
          return target?.x ?? 0
        })
        .attr('y2', d => {
          const target = typeof d.target === 'string' ? nodes.find(n => n.id === d.target) : d.target as Node
          return target?.y ?? 0
        })

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    function dragStarted(_event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      if (!_event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(_event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      d.fx = _event.x
      d.fy = _event.y
    }

    function dragEnded(_event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      if (!_event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    function highlightConnectedNodes(nodeId: string) {
      const connectedIds = new Set<string>()
      edges.forEach(edge => {
        if (edge.source === nodeId) connectedIds.add(edge.target)
        if (edge.target === nodeId) connectedIds.add(edge.source)
      })

      node.style('opacity', d => connectedIds.has(d.id) || d.id === nodeId ? 1 : 0.2)
      link.style('opacity', d =>
        (d.source === nodeId || d.target === nodeId) ? 1 : 0.1
      )
    }

    function clearHighlight() {
      node.style('opacity', 1)
      link.style('opacity', 0.6)
    }

    return () => {
      simulation.stop()
    }
  }, [nodes, edges, selectedNode, onNodeSelect, highlightedNodes])

  // 赛博朋克背景网格
  function createCyberBackground(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) {
    const defs = svg.append('defs')

    // 网格图案
    const gridPattern = defs.append('pattern')
      .attr('id', 'cyber-grid')
      .attr('width', 50)
      .attr('height', 50)
      .attr('patternUnits', 'userSpaceOnUse')

    gridPattern.append('rect')
      .attr('width', 50)
      .attr('height', 50)
      .attr('fill', '#0a0a0a')

    gridPattern.append('path')
      .attr('d', 'M 50 0 L 0 0 0 50')
      .attr('fill', 'none')
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 1)

    // 背景矩形
    svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'url(#cyber-grid)')

    // 扫描线
    const scanLine = svg.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', '#00ff88')
      .attr('stroke-width', 2)
      .attr('opacity', 0.3)

    function animateScanLine() {
      scanLine
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('opacity', 0.3)
        .transition()
        .duration(3000)
        .ease(d3.easeLinear)
        .attr('y1', height)
        .attr('y2', height)
        .attr('opacity', 0)
        .on('end', animateScanLine)
    }

    animateScanLine()

    // 漂浮粒子
    const particles = svg.append('g')
    for (let i = 0; i < 30; i++) {
      particles.append('circle')
        .attr('r', Math.random() * 2)
        .attr('cx', Math.random() * width)
        .attr('cy', Math.random() * height)
        .attr('fill', '#00ff88')
        .attr('opacity', Math.random() * 0.5)
        .append('animate')
        .attr('attributeName', 'cy')
        .attr('values', `${Math.random() * height};${Math.random() * height}`)
        .attr('dur', `${10 + Math.random() * 20}s`)
        .attr('repeatCount', 'indefinite')
    }
  }

  // 发光滤镜
  function createGlowFilter(defs: d3.Selection<SVGDefsElement, unknown, null, undefined>) {
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')

    filter.append('feGaussianBlur')
      .attr('id', 'node-glow')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur')

    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // 链接发光
    const linkFilter = defs.append('filter')
      .attr('id', 'link-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')

    linkFilter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur')

    const linkMerge = linkFilter.append('feMerge')
    linkMerge.append('feMergeNode').attr('in', 'coloredBlur')
    linkMerge.append('feMergeNode').attr('in', 'SourceGraphic')
  }

  // 渐变链接
  function createGradientLink(defs: d3.Selection<SVGDefsElement, unknown, null, undefined>) {
    const gradient = defs.append('linearGradient')
      .attr('id', 'edge-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%')

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#00ff88')

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#00ffff')
  }

  // 六边形创建函数
  function createHexagon(group: d3.Selection<SVGGElement, unknown, null, undefined>, size: number, color: string) {
    const points = []
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6
      points.push(`${size * Math.cos(angle)},${size * Math.sin(angle)}`)
    }

    group.append('polygon')
      .attr('points', points.join(' '))
      .attr('fill', color)
      .attr('opacity', 0.9)
      .style('filter', 'url(#node-glow)')
  }

  // 菱形创建函数
  function createDiamond(group: d3.Selection<SVGGElement, unknown, null, undefined>, size: number, color: string) {
    const points = [
      `0,${-size}`,
      `${size},0`,
      `0,${size}`,
      `${-size},0`
    ]

    group.append('polygon')
      .attr('points', points.join(' '))
      .attr('fill', color)
      .attr('opacity', 0.7)
      .style('filter', 'url(#node-glow)')
  }

  // 语义聚类力
  function createClusterForce(nodes: Node[]) {
    const clusters = new Map<string, Node[]>()

    nodes.forEach(node => {
      const key = `${node.language}-${node.code_type}`
      if (!clusters.has(key)) {
        clusters.set(key, [])
      }
      clusters.get(key)!.push(node)
    })

    const clusterCenters = new Map<string, {x: number, y: number}>()
    const angleStep = (2 * Math.PI) / clusters.size

    let i = 0
    clusters.forEach((_, key) => {
      const angle = angleStep * i
      clusterCenters.set(key, {
        x: Math.cos(angle) * 200,
        y: Math.sin(angle) * 200
      })
      i++
    })

    // 返回一个力函数，将节点拉向其聚类中心
    return (alpha: number) => {
      nodes.forEach(node => {
        const key = `${node.language}-${node.code_type}`
        const center = clusterCenters.get(key)
        if (center) {
          node.x += (center.x - node.x) * alpha * 0.1
          node.y += (center.y - node.y) * alpha * 0.1
        }
      })
    }
  }

  function getNodeSize(node: Node): number {
    const baseSize = 8
    const complexityBonus = Math.min(node.complexity / 5, 12)
    return baseSize + complexityBonus
  }

  function getNodeColor(node: Node): string {
    // 赛博朋克色彩方案
    const colorScheme: Record<string, string> = {
      python: '#00ff88',      // 霓虹绿
      javascript: '#ff00ff',  // 霓虹粉
      typescript: '#00ffff',  // 霓虹蓝
      rust: '#ff6600',        // 霓虹橙
      go: '#ffff00',          // 霓虹黄
      unknown: '#9400d3'      // 霓虹紫
    }

    return colorScheme[node.language] || colorScheme.unknown
  }

  function getEdgeWidth(similarity: number): number {
    // 相似度越高，线条越粗
    return Math.max(1, similarity * 5)
  }

  function getEdgeGradient(similarity: number): string {
    // 根据相似度返回渐变ID或颜色
    if (similarity >= 0.9) return '#00ff88'
    if (similarity >= 0.85) return '#00ffff'
    if (similarity >= 0.8) return '#ff00ff'
    return '#4a5568'
  }

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: '#0a0a0a' }}
    />
  )
}
