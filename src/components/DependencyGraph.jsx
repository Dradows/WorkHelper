import { useMemo, useRef, useState } from 'react'

const sampleInput = `JOB_A JOB_B 06:00:00 12
JOB_A JOB_C 06:01:00 18
JOB_B JOB_D 05:00:00 31`

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

  const parsed = useMemo(() => parseRows(input), [input])
  const graph = useMemo(() => buildGraph(parsed.rows), [parsed.rows])
  const criticalNodeNames = useMemo(() => parseNodeNames(criticalInput), [criticalInput])
  const visibleNodes = useMemo(() => {
    if (!input.trim()) return new Set()
    return getVisibleNodes(graph, expandedNodes.size ? expandedNodes : createDefaultVisibleNodes(graph, criticalNodeNames))
  }, [criticalNodeNames, expandedNodes, graph, input])
  const layout = useMemo(() => computeLayout(graph, visibleNodes), [graph, visibleNodes])
  const criticalPath = useMemo(() => computeCriticalPath(graph), [graph])
  const downstreamNodes = useMemo(
    () => computeVisibleDownstreamNodes(graph, visibleNodes, hoveredNodeId),
    [graph, hoveredNodeId, visibleNodes]
  )
  const visibleEdges = graph.edges.filter((edge) => visibleNodes.has(edge.from) && visibleNodes.has(edge.to))
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
    <div className="container dependency-graph">
      <div className="input-section">
        <label htmlFor="dependency-input">依赖数据</label>
        <textarea
          id="dependency-input"
          value={input}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder="粘贴数据：JOB_A JOB_B 12:31:10 31"
          rows={8}
        />

        <label htmlFor="critical-nodes" className="dependency-critical-label">关键节点</label>
        <input
          id="critical-nodes"
          value={criticalInput}
          onChange={(event) => handleCriticalInputChange(event.target.value)}
          placeholder="多个节点可用空格、逗号或分号分隔，例如 JOB_063 JOB_100"
        />

        <div className="dependency-actions">
          <button className="clear-btn" type="button" onClick={handleClear} disabled={!input.trim()}>
            清空
          </button>
          <button className="process-btn" type="button" onClick={handleUseSample}>
            示例
          </button>
        </div>
      </div>

      <div className="dependency-output-section">
        <div className="dependency-summary">
          <h3>依赖图</h3>
          <span>{graph.nodes.size} 个节点 / {graph.edges.length} 条依赖</span>
        </div>

        {parsed.errors.length > 0 && (
          <div className="dependency-alert">
            {parsed.errors.slice(0, 3).join('；')}
            {parsed.errors.length > 3 ? `；另有 ${parsed.errors.length - 3} 个问题` : ''}
          </div>
        )}

        {!input.trim() ? (
          <div className="dependency-empty">输入数据后将在这里生成有向无环图</div>
        ) : graph.nodes.size === 0 ? (
          <div className="dependency-empty">没有解析到有效作业</div>
        ) : (
          <>
            {isLargeGraph && (
              <div className="dependency-hint">
                节点超过 30 个，已默认展示根节点及其依赖；点击带圆点的节点继续展开下一层。
              </div>
            )}
            <div
              ref={canvasRef}
              className={`dependency-canvas ${isDraggingCanvas ? 'dependency-canvas-dragging' : ''}`}
              role="img"
              aria-label="???????"
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

                {visibleEdges.map((edge) => {
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
                      className={[
                        'dependency-edge',
                        isCriticalEdge ? 'dependency-edge-highlighted' : '',
                      ].filter(Boolean).join(' ')}
                      d={`M ${startX} ${startY} C ${middleX} ${startY}, ${middleX} ${endY}, ${endX - 8} ${endY}`}
                      markerEnd={isCriticalEdge ? 'url(#dependency-arrow-highlighted)' : 'url(#dependency-arrow)'}
                    />
                  )
                })}

                {Array.from(visibleNodes).map((id) => {
                  const node = graph.nodes.get(id)
                  const position = layout.positions.get(id)
                  const dependencies = Array.from(graph.dependencyMap.get(id) || [])
                  const hiddenCount = dependencies.filter((dependency) => !visibleNodes.has(dependency)).length
                  const isHighlighted = criticalPath.highlightedNodes.has(id)
                  const isDownstream = downstreamNodes.has(id)
                  if (!node || !position) return null

                  return (
                    <g
                      key={id}
                      className={[
                        'dependency-node',
                        hiddenCount ? 'dependency-node-expandable' : '',
                        isHighlighted ? 'dependency-node-highlighted' : '',
                        isDownstream ? 'dependency-node-downstream' : '',
                      ].filter(Boolean).join(' ')}
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
      </div>
    </div>
  )
}

export default DependencyGraph
