import { useMemo, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Checkbox } from './ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Trash2, Sparkles } from 'lucide-react'

const sampleInput = `ROOT JOB_LOAD    06:30:00 60
ROOT JOB_CHECK   06:28:00 45
JOB_LOAD JOB_ETL_01  06:00:00 12
JOB_LOAD JOB_ETL_02  06:05:00 18
JOB_LOAD JOB_ETL_03  06:02:00 22
JOB_CHECK JOB_VALID_01 05:55:00 15
JOB_CHECK JOB_VALID_02 05:58:00 10
JOB_ETL_01 JOB_CALC_A 05:30:00 30
JOB_ETL_01 JOB_CALC_B 05:35:00 25
JOB_ETL_02 JOB_CALC_C 05:40:00 20
JOB_ETL_02 JOB_CALC_D 05:38:00 28
JOB_ETL_03 JOB_CALC_E 05:50:00 16
JOB_ETL_03 JOB_CALC_F 05:45:00 19
JOB_VALID_01 JOB_CALC_G 05:20:00 35
JOB_VALID_02 JOB_CALC_H 05:25:00 14
JOB_CALC_A JOB_MERGE_01 04:30:00 8
JOB_CALC_B JOB_MERGE_02 04:35:00 12
JOB_CALC_C JOB_MERGE_03 04:40:00 10
JOB_CALC_D JOB_MERGE_04 04:32:00 18
JOB_CALC_E JOB_MERGE_01 04:28:00 22
JOB_CALC_F JOB_MERGE_02 04:45:00 14
JOB_CALC_G JOB_MERGE_03 04:50:00 9
JOB_CALC_H JOB_MERGE_04 04:55:00 11
JOB_MERGE_01 JOB_REPORT 03:30:00 45
JOB_MERGE_02 JOB_REPORT 03:35:00 40
JOB_MERGE_03 JOB_REPORT 03:40:00 38
JOB_MERGE_04 JOB_REPORT 03:50:00 33
JOB_REPORT JOB_ARCHIVE 02:00:00 20`

const fieldNames = ['job_name', 'pre_job_name', 'pre_end_time', 'pre_use_time']
const rootTimeToken = 'ROOT'
const nodeWidth = 172
const nodeHeight = 78
const columnGap = 90
const rowGap = 28
const margin = 36
const bottomDragPadding = 220

const normalizeName = (value) => String(value || '').trim()

const getEdgeKey = (from, to) => `${from}->${to}`

const parseTimeValue = (value) => {
  const text = normalizeName(value)
  const timeMatch = text.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)

  if (timeMatch) {
    return Number(timeMatch[1]) * 3600 + Number(timeMatch[2]) * 60 + Number(timeMatch[3])
  }

  const numericValue = Number(text)
  return Number.isFinite(numericValue) ? numericValue : Number.NEGATIVE_INFINITY
}

const parseNodeNames = (value) => (
  value
    .split(/[\s,;，；]+/)
    .map((item) => item.trim())
    .filter(Boolean)
)

const splitLine = (line) => {
  const trimmed = line.trim()
  if (!trimmed) return []
  if (trimmed.includes('\t')) return trimmed.split('\t').map((item) => item.trim())
  if (trimmed.includes(',')) return trimmed.split(',').map((item) => item.trim())
  return trimmed.split(/\s+/).map((item) => item.trim())
}

const parseKeyValueLine = (line) => {
  const result = {}
  const pattern = /(job_name|pre_job_name|pre_end_time|pre_use_time)\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,]+)/gi
  let match = pattern.exec(line)

  while (match) {
    result[match[1].toLowerCase()] = match[2].replace(/^['"]|['"]$/g, '')
    match = pattern.exec(line)
  }

  return Object.keys(result).length ? result : null
}

const parseRows = (input) => {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return { rows: [], errors: [] }

  const firstParts = splitLine(lines[0]).map((item) => item.toLowerCase())
  const hasHeader = fieldNames.every((name) => firstParts.includes(name))
  const headerIndexes = hasHeader
    ? fieldNames.reduce((acc, name) => ({ ...acc, [name]: firstParts.indexOf(name) }), {})
    : null

  const rows = []
  const errors = []
  const dataLines = hasHeader ? lines.slice(1) : lines

  dataLines.forEach((line, index) => {
    const keyValueRow = parseKeyValueLine(line)
    const rowNumber = index + (hasHeader ? 2 : 1)
    const row = keyValueRow || {}

    if (!keyValueRow) {
      const parts = splitLine(line)
      fieldNames.forEach((name, fieldIndex) => {
        const sourceIndex = headerIndexes ? headerIndexes[name] : fieldIndex
        row[name] = parts[sourceIndex] || ''
      })
    }

    const jobName = normalizeName(row.job_name)
    const preJobName = normalizeName(row.pre_job_name)

    if (!jobName) {
      errors.push(`第 ${rowNumber} 行缺少 job_name`)
      return
    }

    rows.push({
      jobName,
      preJobName,
      preEndTime: normalizeName(row.pre_end_time),
      preUseTime: normalizeName(row.pre_use_time),
    })
  })

  return { rows, errors }
}

const buildGraph = (rows) => {
  const nodes = new Map()
  const edges = []
  const dependencyMap = new Map()
  const dependentMap = new Map()

  const ensureNode = (id) => {
    if (!id) return null
    if (!nodes.has(id)) {
      nodes.set(id, { id, preEndTime: '', preUseTime: '' })
    }
    return nodes.get(id)
  }

  rows.forEach((row) => {
    if (row.jobName.toUpperCase() === rootTimeToken) {
      const node = ensureNode(row.preJobName)
      if (node) {
        if (row.preEndTime) node.preEndTime = row.preEndTime
        if (row.preUseTime) node.preUseTime = row.preUseTime
      }
      return
    }

    ensureNode(row.jobName)
    const preNode = ensureNode(row.preJobName)

    if (preNode) {
      if (row.preEndTime && !preNode.preEndTime) preNode.preEndTime = row.preEndTime
      if (row.preUseTime && !preNode.preUseTime) preNode.preUseTime = row.preUseTime

      edges.push({
        from: row.jobName,
        to: row.preJobName,
        preEndTime: row.preEndTime,
        preUseTime: row.preUseTime,
      })

      if (!dependencyMap.has(row.jobName)) dependencyMap.set(row.jobName, new Set())
      if (!dependentMap.has(row.preJobName)) dependentMap.set(row.preJobName, new Set())
      dependencyMap.get(row.jobName).add(row.preJobName)
      dependentMap.get(row.preJobName).add(row.jobName)
    }
  })

  const roots = Array.from(nodes.keys())
    .filter((id) => !dependentMap.has(id))
    .sort((a, b) => a.localeCompare(b))

  return {
    nodes,
    edges,
    dependencyMap,
    roots: roots.length ? roots : Array.from(nodes.keys()).sort((a, b) => a.localeCompare(b)),
  }
}

const createInitialExpanded = (graph) => {
  if (graph.nodes.size <= 30) {
    return new Set(graph.nodes.keys())
  }

  const expanded = new Set(graph.roots)
  graph.roots.forEach((root) => {
    Array.from(graph.dependencyMap.get(root) || []).forEach((dependency) => expanded.add(dependency))
  })
  return expanded
}

const addPathToTarget = (graph, targetId, expanded) => {
  const target = normalizeName(targetId)
  if (!target || !graph.nodes.has(target)) return

  const visit = (nodeId, path, visited) => {
    if (visited.has(nodeId)) return false

    const nextPath = [...path, nodeId]
    if (nodeId === target) {
      nextPath.forEach((id) => expanded.add(id))
      return true
    }

    const nextVisited = new Set(visited)
    nextVisited.add(nodeId)

    return Array.from(graph.dependencyMap.get(nodeId) || [])
      .some((dependencyId) => visit(dependencyId, nextPath, nextVisited))
  }

  graph.roots.forEach((root) => visit(root, [], new Set()))
}

const createDefaultVisibleNodes = (graph, criticalNodeNames) => {
  const expanded = createInitialExpanded(graph)
  criticalNodeNames.forEach((nodeName) => addPathToTarget(graph, nodeName, expanded))
  return expanded
}

const getVisibleNodes = (graph, expandedNodes) => {
  if (graph.nodes.size <= 30) return new Set(graph.nodes.keys())
  return expandedNodes
}

const computeLayout = (graph, visibleNodes) => {
  const levels = new Map()
  const visitQueue = graph.roots.filter((id) => visibleNodes.has(id)).map((id) => ({ id, level: 0 }))

  visitQueue.forEach(({ id }) => levels.set(id, 0))

  while (visitQueue.length) {
    const { id, level } = visitQueue.shift()
    Array.from(graph.dependencyMap.get(id) || []).forEach((child) => {
      if (!visibleNodes.has(child)) return
      const nextLevel = level + 1
      if (!levels.has(child) || nextLevel > levels.get(child)) {
        levels.set(child, nextLevel)
        visitQueue.push({ id: child, level: nextLevel })
      }
    })
  }

  Array.from(visibleNodes).forEach((id) => {
    if (!levels.has(id)) levels.set(id, 0)
  })

  const grouped = Array.from(visibleNodes).reduce((acc, id) => {
    const level = levels.get(id) || 0
    if (!acc.has(level)) acc.set(level, [])
    acc.get(level).push(id)
    return acc
  }, new Map())

  const positions = new Map()
  const maxLevel = Math.max(0, ...Array.from(grouped.keys()))
  let maxRows = 1

  Array.from(grouped.entries()).forEach(([level, ids]) => {
    ids.sort((a, b) => {
      const timeDiff = parseTimeValue(graph.nodes.get(b)?.preEndTime) - parseTimeValue(graph.nodes.get(a)?.preEndTime)
      return timeDiff || a.localeCompare(b)
    })
    maxRows = Math.max(maxRows, ids.length)
    ids.forEach((id, index) => {
      positions.set(id, {
        x: margin + level * (nodeWidth + columnGap),
        y: margin + index * (nodeHeight + rowGap),
      })
    })
  })

  return {
    positions,
    width: margin * 2 + (maxLevel + 1) * nodeWidth + maxLevel * columnGap,
    height: margin * 2 + maxRows * nodeHeight + Math.max(0, maxRows - 1) * rowGap + bottomDragPadding,
  }
}

const computeCriticalPath = (graph) => {
  const highlightedNodes = new Set()
  const highlightedEdges = new Set()
  const queue = [...graph.roots]
  const visitedParents = new Set()

  while (queue.length) {
    const parentId = queue.shift()
    if (visitedParents.has(parentId)) continue
    visitedParents.add(parentId)

    const dependencies = Array.from(graph.dependencyMap.get(parentId) || [])
    if (!dependencies.length) continue

    const maxTime = Math.max(
      ...dependencies.map((dependencyId) => parseTimeValue(graph.nodes.get(dependencyId)?.preEndTime))
    )

    dependencies
      .filter((dependencyId) => parseTimeValue(graph.nodes.get(dependencyId)?.preEndTime) === maxTime)
      .forEach((dependencyId) => {
        highlightedNodes.add(dependencyId)
        highlightedEdges.add(getEdgeKey(parentId, dependencyId))
        queue.push(dependencyId)
      })
  }

  return { highlightedNodes, highlightedEdges }
}

const computeVisibleDownstreamNodes = (graph, visibleNodes, sourceId) => {
  const downstream = new Set()
  if (!sourceId) return downstream

  const queue = Array.from(graph.dependencyMap.get(sourceId) || [])

  while (queue.length) {
    const nodeId = queue.shift()
    if (downstream.has(nodeId)) continue

    if (visibleNodes.has(nodeId)) {
      downstream.add(nodeId)
    }

    Array.from(graph.dependencyMap.get(nodeId) || []).forEach((dependencyId) => {
      if (visibleNodes.has(dependencyId)) queue.push(dependencyId)
    })
  }

  return downstream
}

const DependencyGraph = () => {
  const canvasRef = useRef(null)
  const dragStateRef = useRef(null)
  const [input, setInput] = useState('')
  const [criticalInput, setCriticalInput] = useState('')
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [hoveredNodeId, setHoveredNodeId] = useState('')
  const [showOnlyCriticalPath, setShowOnlyCriticalPath] = useState(false)

  const parsed = useMemo(() => parseRows(input), [input])
  const graph = useMemo(() => buildGraph(parsed.rows), [parsed.rows])
  const criticalNodeNames = useMemo(() => parseNodeNames(criticalInput), [criticalInput])
  const visibleNodes = useMemo(() => {
    if (!input.trim()) return new Set()
    return getVisibleNodes(graph, expandedNodes.size ? expandedNodes : createDefaultVisibleNodes(graph, criticalNodeNames))
  }, [criticalNodeNames, expandedNodes, graph, input])
  const criticalPath = useMemo(() => computeCriticalPath(graph), [graph])
  const downstreamNodes = useMemo(
    () => computeVisibleDownstreamNodes(graph, visibleNodes, hoveredNodeId),
    [graph, hoveredNodeId, visibleNodes]
  )
  const visibleEdges = graph.edges.filter((edge) => visibleNodes.has(edge.from) && visibleNodes.has(edge.to))

  const displayNodes = useMemo(() => {
    if (!showOnlyCriticalPath || criticalPath.highlightedNodes.size === 0) return visibleNodes

    const filtered = new Set()
    criticalPath.highlightedNodes.forEach((id) => {
      if (visibleNodes.has(id)) filtered.add(id)
    })
    graph.roots.forEach((rootId) => {
      if (!visibleNodes.has(rootId)) return
      const children = graph.dependencyMap.get(rootId) || new Set()
      const hasHighlightedChild = Array.from(children).some((childId) =>
        criticalPath.highlightedNodes.has(childId)
      )
      if (hasHighlightedChild) filtered.add(rootId)
    })
    return filtered
  }, [showOnlyCriticalPath, visibleNodes, criticalPath.highlightedNodes, graph])

  const layout = useMemo(() => computeLayout(graph, displayNodes), [graph, displayNodes])

  const displayEdges = showOnlyCriticalPath && criticalPath.highlightedEdges.size > 0
    ? visibleEdges.filter((edge) => criticalPath.highlightedEdges.has(getEdgeKey(edge.from, edge.to)))
    : visibleEdges

  const isLargeGraph = graph.nodes.size > 30

  const handleInputChange = (value) => {
    setInput(value)
    const nextGraph = buildGraph(parseRows(value).rows)
    setExpandedNodes(createDefaultVisibleNodes(nextGraph, parseNodeNames(criticalInput)))
  }

  const handleCriticalInputChange = (value) => {
    setCriticalInput(value)
    setExpandedNodes(createDefaultVisibleNodes(graph, parseNodeNames(value)))
  }

  const handleNodeClick = (id) => {
    const dependencies = Array.from(graph.dependencyMap.get(id) || [])
    if (!dependencies.length) return

    setExpandedNodes((prev) => {
      const next = new Set(prev.size ? prev : createDefaultVisibleNodes(graph, criticalNodeNames))
      dependencies.forEach((dependency) => next.add(dependency))
      return next
    })
  }

  const handleUseSample = () => handleInputChange(sampleInput)
  const handleClear = () => handleInputChange('')

  const handleNameDoubleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()

    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(event.currentTarget)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const handleCanvasMouseDown = (event) => {
    if (event.button !== 0 || !canvasRef.current) return

    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: canvasRef.current.scrollLeft,
      scrollTop: canvasRef.current.scrollTop,
    }
    setIsDraggingCanvas(true)
  }

  const handleCanvasMouseMove = (event) => {
    if (!dragStateRef.current || !canvasRef.current) return

    const deltaX = event.clientX - dragStateRef.current.startX
    const deltaY = event.clientY - dragStateRef.current.startY
    canvasRef.current.scrollLeft = dragStateRef.current.scrollLeft - deltaX
    canvasRef.current.scrollTop = dragStateRef.current.scrollTop - deltaY
  }

  const handleCanvasMouseUp = () => {
    dragStateRef.current = null
    setIsDraggingCanvas(false)
  }

  return (
    <Card className="w-full max-w-[860px] mx-auto">
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-3">
          <Label htmlFor="dependency-input">依赖数据</Label>
          <Textarea
            id="dependency-input"
            value={input}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder="粘贴数据：JOB_A JOB_B 12:31:10 31"
            rows={8}
            className="font-mono text-sm"
          />

          <Label htmlFor="critical-nodes">关键节点</Label>
          <Input
            id="critical-nodes"
            value={criticalInput}
            onChange={(event) => handleCriticalInputChange(event.target.value)}
            placeholder="多个节点可用空格、逗号或分号分隔，例如 JOB_063 JOB_100"
          />

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" size="sm" onClick={handleClear} disabled={!input.trim()}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              清空
            </Button>
            <Button size="sm" onClick={handleUseSample}>
              <Sparkles className="w-4 h-4 mr-1.5" />
              示例
            </Button>
          </div>
        </div>
      </CardContent>

      <Separator />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">依赖图</CardTitle>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={showOnlyCriticalPath}
                onCheckedChange={(checked) => setShowOnlyCriticalPath(!!checked)}
              />
              <span className="text-sm font-medium text-amber-800">仅显示关键路径</span>
            </label>
            <span className="text-sm font-semibold text-muted-foreground">
              {graph.nodes.size} 个节点 / {graph.edges.length} 条依赖
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {parsed.errors.length > 0 && (
          <div className="mb-3 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm leading-relaxed">
            {parsed.errors.slice(0, 3).join('；')}
            {parsed.errors.length > 3 ? `；另有 ${parsed.errors.length - 3} 个问题` : ''}
          </div>
        )}

        {!input.trim() ? (
          <div className="min-h-[260px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/30 text-muted-foreground text-sm">
            输入数据后将在这里生成有向无环图
          </div>
        ) : graph.nodes.size === 0 ? (
          <div className="min-h-[260px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/30 text-muted-foreground text-sm">
            没有解析到有效作业
          </div>
        ) : (
          <>
            {isLargeGraph && (
              <div className="mb-3 p-3 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-sm leading-relaxed">
                节点超过 30 个，已默认展示根节点及其依赖；点击带圆点的节点继续展开下一层。
              </div>
            )}
            <div
              ref={canvasRef}
              className={`w-full h-[min(760px,78vh)] min-h-[320px] overflow-auto border rounded-lg cursor-grab select-none bg-[linear-gradient(#fafbfc,#fafbfc)_padding-box,repeating-linear-gradient(0deg,transparent_0,transparent_31px,#eef2f7_32px),repeating-linear-gradient(90deg,transparent_0,transparent_31px,#eef2f7_32px)] ${isDraggingCanvas ? 'cursor-grabbing' : ''}`}
              role="img"
              aria-label="依赖图画布"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            >
              <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`}>
                <defs>
                  <marker id="dependency-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
                  </marker>
                  <marker id="dependency-arrow-highlighted" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#d97706" />
                  </marker>
                </defs>

                {displayEdges.map((edge) => {
                  const from = layout.positions.get(edge.from)
                  const to = layout.positions.get(edge.to)
                  if (!from || !to) return null

                  const startX = from.x + nodeWidth
                  const startY = from.y + nodeHeight / 2
                  const endX = to.x
                  const endY = to.y + nodeHeight / 2
                  const middleX = startX + Math.max(36, (endX - startX) / 2)
                  const isCriticalEdge = criticalPath.highlightedEdges.has(getEdgeKey(edge.from, edge.to))

                  return (
                    <path
                      key={`${edge.from}->${edge.to}`}
                      className={`dependency-edge ${isCriticalEdge ? 'dependency-edge-highlighted' : ''}`}
                      d={`M ${startX} ${startY} C ${middleX} ${startY}, ${middleX} ${endY}, ${endX - 8} ${endY}`}
                      markerEnd={isCriticalEdge ? 'url(#dependency-arrow-highlighted)' : 'url(#dependency-arrow)'}
                    />
                  )
                })}

                {Array.from(displayNodes).map((id) => {
                  const node = graph.nodes.get(id)
                  const position = layout.positions.get(id)
                  const dependencies = Array.from(graph.dependencyMap.get(id) || [])
                  const hiddenCount = showOnlyCriticalPath ? 0 : dependencies.filter((dependency) => !visibleNodes.has(dependency)).length
                  const isHighlighted = criticalPath.highlightedNodes.has(id)
                  const isDownstream = downstreamNodes.has(id)
                  if (!node || !position) return null

                  return (
                    <g
                      key={id}
                      className={`dependency-node ${hiddenCount ? 'dependency-node-expandable' : ''} ${isHighlighted ? 'dependency-node-highlighted' : ''} ${isDownstream ? 'dependency-node-downstream' : ''}`}
                      transform={`translate(${position.x}, ${position.y})`}
                      onClick={() => handleNodeClick(id)}
                      onMouseEnter={() => setHoveredNodeId(id)}
                      onMouseLeave={() => setHoveredNodeId('')}
                    >
                      <title>{id}</title>
                      <rect width={nodeWidth} height={nodeHeight} rx="8" />
                      <foreignObject x="14" y="8" width={nodeWidth - 38} height="30">
                        <div
                          xmlns="http://www.w3.org/1999/xhtml"
                          className="dependency-node-title"
                          title={id}
                          onDoubleClick={handleNameDoubleClick}
                        >
                          {id}
                        </div>
                      </foreignObject>
                      <text className="dependency-node-meta" x="14" y="48">结束: {node.preEndTime || '-'}</text>
                      <text className="dependency-node-meta" x="14" y="66">耗时: {node.preUseTime || '-'}</text>
                      {hiddenCount > 0 && (
                        <>
                          <circle cx={nodeWidth - 18} cy="18" r="9" />
                          <text className="dependency-node-count" x={nodeWidth - 18} y="22">{hiddenCount}</text>
                        </>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default DependencyGraph
