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

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink(edges)
        .id(d => d.id)
        .distance(100)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(d => getNodeSize(d) + 5)
      )

    simulationRef.current = simulation

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    svg.call(zoom)

    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', d => getEdgeColor(d.similarity))
      .attr('stroke-opacity', d => getEdgeOpacity(d.similarity))
      .attr('stroke-width', d => getEdgeWidth(d.similarity))

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
      )

    node.each(function(d) {
      const nodeGroup = d3.select(this)
      const size = getNodeSize(d)
      const color = getNodeColor(d.language)

      if (d.code_type === 'function') {
        nodeGroup.append('circle')
          .attr('r', size)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
      } else if (d.code_type === 'class') {
        nodeGroup.append('rect')
          .attr('width', size * 2)
          .attr('height', size * 2)
          .attr('x', -size)
          .attr('y', -size)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
      } else {
        nodeGroup.append('circle')
          .attr('r', size)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
      }
    })

    node.on('click', (event, d) => {
      onNodeSelect(d)
    })

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    function dragStarted(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragEnded(event: d3.D3DragEvent<SVGGElement, Node, any>, d: Node) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    return () => {
      simulation.stop()
    }
  }, [nodes, edges])

  function getNodeSize(node: Node): number {
    if (node.complexity < 10) return 8
    if (node.complexity < 30) return 12
    return 16
  }

  function getNodeColor(language: string): string {
    const colors: Record<string, string> = {
      python: '#3B82F6',
      javascript: '#FBBF24',
      typescript: '#10B981'
    }
    return colors[language] || '#6B7280'
  }

  function getEdgeWidth(similarity: number): number {
    if (similarity >= 0.90) return 4
    if (similarity >= 0.85) return 3
    if (similarity >= 0.80) return 2
    return 1
  }

  function getEdgeColor(similarity: number): string {
    if (similarity >= 0.90) return '#3B82F6'
    if (similarity >= 0.85) return '#60A5FA'
    return '#9CA3AF'
  }

  function getEdgeOpacity(similarity: number): number {
    if (similarity >= 0.85) return 0.8
    return 0.3
  }

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: '#111827' }}
    />
  )
}
