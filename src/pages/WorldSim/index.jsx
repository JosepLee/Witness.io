import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import {
  SIM_SEED_NODES, SIM_SEED_EDGES,
  SIM_AGENTS, SIM_ROUNDS, SIM_LOGS,
} from '../../data/mockData'

// ── Helpers ────────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms))

function agentById(id) { return SIM_AGENTS.find(a => a.id === id) }

function nodeColor(n) {
  if (n.type === 'seed_event')    return '#f59e0b'
  if (n.type === 'seed_actor')    return '#f59e0b'
  if (n.type === 'seed_location') return '#f59e0b'
  const ag = agentById(n.agentId)
  return ag?.color ?? '#64748b'
}

function nodeRadius(n) {
  if (n.type?.startsWith('seed')) return 26
  if (n.agentId) return 14  // agent ref: used internally — agent nodes size
  return 14
}

function typeIcon(type) {
  if (type === 'assessment') return '◉'
  if (type === 'report')     return '▤'
  if (type === 'command')    return '⚡'
  if (type === 'intel')      return '◈'
  if (type === 'media')      return '◎'
  if (type === 'defense')    return '⬡'
  if (type === 'escalation') return '▲'
  if (type === 'diplomacy')  return '◇'
  return '·'
}

// Build initial graph: seed nodes + agent nodes + seed edges + agent→seed edges
function buildInitialGraph() {
  const nodes = [
    ...SIM_SEED_NODES.map(n => ({ ...n, r: 26 })),
    ...SIM_AGENTS.map(a => ({ id: a.id, label: a.shortName, sublabel: a.role, type: 'agent', agentId: a.id, r: 20 })),
  ]
  const links = [
    ...SIM_SEED_EDGES.map(e => ({ ...e })),
    ...SIM_AGENTS.map(a => ({
      id: `init_${a.id}`, source: a.id, target: a.seedLink, virtual: false,
    })),
  ]
  return { nodes, links }
}

// ── Left Panel: Agent List ─────────────────────────────────────────────────────

function AgentPanel({ activeAgentId, round, running, onStart, onStop, nodeCount }) {
  return (
    <div style={{
      width: '220px', flexShrink: 0,
      borderRight: '1px solid #1a2d45',
      display: 'flex', flexDirection: 'column',
      background: '#040810',
    }}>
      {/* Header */}
      <div style={{ padding: '12px', borderBottom: '1px solid #1a2d45' }}>
        <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.12em', marginBottom: '6px' }}>
          模拟角色 · {SIM_AGENTS.length} AGENTS
        </div>
        {/* Round indicator */}
        <div style={{ display: 'flex', gap: '3px' }}>
          {['种子', '轮次1', '轮次2', '轮次3'].map((label, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: '3px', borderRadius: '1px',
                background: round >= i ? '#f59e0b' : '#1a2d45',
                transition: 'background 0.4s',
              }} />
              <div style={{ fontSize: '8px', color: round >= i ? '#f59e0b' : '#1e3a5f', marginTop: '3px', transition: 'color 0.4s' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {SIM_AGENTS.map(ag => {
          const isActive = ag.id === activeAgentId
          return (
            <div key={ag.id} style={{
              padding: '7px 12px',
              borderLeft: `2px solid ${isActive ? ag.color : 'transparent'}`,
              background: isActive ? `${ag.color}0a` : 'transparent',
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: ag.color, flexShrink: 0,
                  boxShadow: isActive ? `0 0 6px ${ag.color}` : 'none',
                  transition: 'box-shadow 0.2s',
                }} />
                <div style={{ fontSize: '11px', color: isActive ? '#e2e8f0' : '#94a3b8', flex: 1, transition: 'color 0.2s' }}>
                  {ag.shortName}
                </div>
                {isActive && (
                  <div style={{
                    fontSize: '9px', color: ag.color,
                    animation: 'blink 0.8s step-end infinite',
                  }}>
                    ▶ 生成中
                  </div>
                )}
              </div>
              <div style={{ fontSize: '9px', color: '#334155', marginTop: '2px', marginLeft: '13px' }}>
                {ag.role}
              </div>
            </div>
          )
        })}
      </div>

      {/* Graph stats */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #0f1a2e', borderBottom: '1px solid #1a2d45' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
          <span style={{ color: '#334155' }}>图谱节点</span>
          <span style={{ color: '#f59e0b', fontFamily: 'monospace' }}>{nodeCount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '3px' }}>
          <span style={{ color: '#334155' }}>虚拟节点</span>
          <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{Math.max(0, nodeCount - 11)}</span>
        </div>
      </div>

      {/* Control */}
      <div style={{ padding: '10px 12px' }}>
        {!running ? (
          <button onClick={onStart} disabled={round >= 3} style={{
            width: '100%', padding: '8px',
            background: round >= 3 ? '#1a2d45' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${round >= 3 ? '#1a2d45' : '#f59e0b'}`,
            color: round >= 3 ? '#334155' : '#f59e0b',
            fontSize: '11px', letterSpacing: '0.08em',
            cursor: round >= 3 ? 'default' : 'pointer', borderRadius: '2px',
          }}>
            {round >= 3 ? '✓ 模拟已完成' : round === 0 ? '▶ 启动模拟' : `▶ 继续轮次 ${round + 1}`}
          </button>
        ) : (
          <button onClick={onStop} style={{
            width: '100%', padding: '8px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
            color: '#ef4444', fontSize: '11px', cursor: 'pointer', borderRadius: '2px',
          }}>
            ■ 停止模拟
          </button>
        )}
        <div style={{ fontSize: '9px', color: '#1e3a5f', marginTop: '6px', textAlign: 'center', lineHeight: 1.4 }}>
          {round === 0 ? '以信实链验证事件为种子' :
           round === 1 ? '即时反应 T+0~2h' :
           round === 2 ? '次级响应 T+2~12h' :
           '态势收敛 T+12~72h'}
        </div>
      </div>

      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  )
}

// ── Center: D3 Knowledge Graph ─────────────────────────────────────────────────

function SimGraph({ graphData, selectedId, onSelect }) {
  const svgRef  = useRef(null)
  const simRef  = useRef(null)
  const posCache = useRef({})   // id → {x, y}
  const gRef    = useRef(null)  // main <g> selection

  useEffect(() => {
    const el = svgRef.current
    if (!el) return

    const W = el.clientWidth || 700
    const H = el.clientHeight || 500

    // Stop existing simulation
    if (simRef.current) simRef.current.stop()

    const svg = d3.select(el)
    svg.selectAll('*').remove()

    // Defs: arrow markers + CSS animations
    const defs = svg.append('defs')
    defs.append('style').text(`
      @keyframes pulse-seed {
        0%   { r: 30px; opacity: 0.4; }
        100% { r: 50px; opacity: 0; }
      }
      @keyframes appear-virtual {
        from { opacity: 0; transform: scale(0.3); }
        to   { opacity: 1; transform: scale(1); }
      }
      .seed-pulse { animation: pulse-seed 2.5s ease-out infinite; transform-box: fill-box; transform-origin: center; }
      .virtual-appear { animation: appear-virtual 0.4s ease-out forwards; transform-box: fill-box; transform-origin: center; }
    `)

    // Arrow marker factory
    const addMarker = (id, color) => {
      defs.append('marker')
        .attr('id', id).attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('refX', 5).attr('refY', 3).attr('orient', 'auto')
        .append('path').attr('d', 'M0,0 L0,6 L6,3 z')
        .attr('fill', color).attr('opacity', 0.7)
    }
    addMarker('arr-solid', '#475569')
    addMarker('arr-virtual', '#334155')
    SIM_AGENTS.forEach(a => addMarker(`arr-${a.id}`, a.color))

    const g = svg.append('g')
    gRef.current = g

    // Restore positions from cache
    const nodes = graphData.nodes.map(n => ({
      ...n,
      x: posCache.current[n.id]?.x,
      y: posCache.current[n.id]?.y,
    }))
    const links = graphData.links.map(l => ({ ...l }))

    // Force simulation
    const sim = d3.forceSimulation(nodes)
      .force('link',      d3.forceLink(links).id(d => d.id).distance(d => {
        const src = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source)
        const tgt = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target)
        if (src?.type?.startsWith('seed') || tgt?.type?.startsWith('seed')) return 100
        if (src?.virtual || tgt?.virtual) return 70
        return 85
      }).strength(0.5))
      .force('charge',    d3.forceManyBody().strength(-220))
      .force('center',    d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(d => (d.r ?? 14) + 18))

    simRef.current = sim

    // ── Edges ──
    const linkSel = g.append('g').attr('class', 'links')
      .selectAll('line').data(links).join('line')
      .attr('stroke', d => {
        if (!d.virtual) return '#1a2d45'
        const ag = agentById(d.agentId ?? (typeof d.source === 'object' ? d.source.agentId : null))
        return ag?.color ?? '#1a2d45'
      })
      .attr('stroke-width', d => d.virtual ? 1 : 1.5)
      .attr('stroke-dasharray', d => d.virtual ? '5,4' : null)
      .attr('opacity', d => d.virtual ? 0.4 : 0.3)
      .attr('marker-end', d => {
        if (!d.virtual) return 'url(#arr-solid)'
        const srcId = typeof d.source === 'string' ? d.source : d.source?.id
        const ag = SIM_AGENTS.find(a => a.id === srcId)
        return ag ? `url(#arr-${ag.id})` : 'url(#arr-virtual)'
      })

    // ── Nodes ──
    const nodeSel = g.append('g').attr('class', 'nodes')
      .selectAll('g').data(nodes).join('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation()
        onSelect(d.id === selectedId ? null : d.id)
      })
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0)
          d.fx = null; d.fy = null
        })
      )

    // Seed pulse ring
    nodeSel.filter(d => d.type?.startsWith('seed'))
      .append('circle').attr('class', 'seed-pulse')
      .attr('r', 30).attr('fill', 'none')
      .attr('stroke', '#f59e0b').attr('stroke-width', 1)
      .attr('opacity', 0.4)

    // Virtual nodes: apply appear animation
    nodeSel.filter(d => d.virtual)
      .attr('class', 'virtual-appear')

    // Main circle
    nodeSel.append('circle')
      .attr('r', d => d.r ?? 14)
      .attr('fill', d => nodeColor(d))
      .attr('fill-opacity', d => d.type?.startsWith('seed') ? 0.18 : d.virtual ? 0.06 : 0.12)
      .attr('stroke', d => nodeColor(d))
      .attr('stroke-width', d => d.type?.startsWith('seed') ? 2 : 1.5)
      .attr('stroke-dasharray', d => d.virtual ? '5,3' : null)

    // Center label
    nodeSel.append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', d => d.type?.startsWith('seed') ? 11 : 10)
      .attr('fill', d => nodeColor(d))
      .attr('font-family', 'monospace')
      .attr('opacity', d => d.virtual ? 0.7 : 0.9)
      .text(d => {
        if (d.type?.startsWith('seed')) return d.label.slice(0, 2)
        if (d.type === 'agent') return d.label.slice(0, 1)
        return typeIcon(d.type)
      })

    // Node name below
    nodeSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', d => (d.r ?? 14) + 13)
      .attr('font-size', 9)
      .attr('fill', d => d.type?.startsWith('seed') ? '#f59e0b' : d.virtual ? '#475569' : '#64748b')
      .attr('font-family', 'monospace')
      .attr('font-style', d => d.virtual ? 'italic' : 'normal')
      .text(d => {
        const lbl = d.label ?? ''
        return lbl.length > 8 ? lbl.slice(0, 8) + '…' : lbl
      })

    // Probability label for round-3 nodes
    nodeSel.filter(d => d.probability != null)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', d => (d.r ?? 14) + 24)
      .attr('font-size', 8)
      .attr('fill', d => d.probability >= 0.6 ? '#f59e0b' : '#64748b')
      .attr('font-family', 'monospace')
      .text(d => `P=${(d.probability * 100).toFixed(0)}%`)

    // Tick
    sim.on('tick', () => {
      linkSel
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => {
          const dx = d.target.x - d.source.x
          const dy = d.target.y - d.source.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const r = (d.target.r ?? 14) + 5
          return d.target.x - dx / dist * r
        })
        .attr('y2', d => {
          const dx = d.target.x - d.source.x
          const dy = d.target.y - d.source.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const r = (d.target.r ?? 14) + 5
          return d.target.y - dy / dist * r
        })

      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`)

      // Cache positions
      nodes.forEach(n => { posCache.current[n.id] = { x: n.x, y: n.y } })
    })

    // Zoom
    svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform)))
    svg.on('click', () => onSelect(null))

    return () => sim.stop()
  }, [graphData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight on select change (without re-running simulation)
  useEffect(() => {
    const g = gRef.current
    if (!g) return
    g.select('.nodes').selectAll('g')
      .attr('opacity', d => selectedId === null || d?.id === selectedId ? 1 : 0.15)
  }, [selectedId])

  return (
    <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
  )
}

// ── Right Panel: Node / Agent Detail ──────────────────────────────────────────

function NodeDetail({ node, onClose }) {
  const ag = agentById(node.agentId)
  const color = nodeColor(node)
  const isSeed = node.type?.startsWith('seed')

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            {node.virtual && <span style={{ fontSize: '9px', color: '#475569', border: '1px dashed #334155', padding: '1px 5px', borderRadius: '2px' }}>虚拟推演节点</span>}
            {isSeed && <span style={{ fontSize: '9px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '1px 5px', borderRadius: '2px' }}>已验证种子事件</span>}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4 }}>
            {node.label}
          </div>
          {node.sublabel && <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>{node.sublabel}</div>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '16px' }}>×</button>
      </div>

      {/* Description */}
      <div style={{ background: '#040f1a', border: '1px solid #1a2d45', borderRadius: '4px', padding: '10px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.7, fontStyle: node.virtual ? 'italic' : 'normal' }}>
          {node.desc ?? node.sublabel ?? '—'}
        </div>
      </div>

      {/* Probability (round 3) */}
      {node.probability != null && (
        <div style={{ background: '#040f1a', border: '1px solid #1a2d45', borderRadius: '4px', padding: '10px' }}>
          <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>预测概率</div>
          <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'monospace', color: node.probability >= 0.6 ? '#f59e0b' : '#64748b' }}>
            {(node.probability * 100).toFixed(0)}%
          </div>
          <div style={{ height: '4px', background: '#1a2d45', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${node.probability * 100}%`, background: node.probability >= 0.6 ? '#f59e0b' : '#64748b' }} />
          </div>
        </div>
      )}

      {/* Generating agent */}
      {ag && (
        <div>
          <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>生成角色</div>
          <div style={{ padding: '8px', background: '#040f1a', border: `1px solid ${ag.color}30`, borderRadius: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ag.color }} />
              <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>{ag.name}</span>
              <span style={{ fontSize: '9px', color: '#475569', background: '#0f1a2e', padding: '1px 5px', borderRadius: '2px' }}>{ag.role}</span>
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.6, borderTop: '1px solid #0f1a2e', paddingTop: '6px' }}>
              <span style={{ color: '#334155' }}>视角提示：</span>{ag.persona}
            </div>
          </div>
        </div>
      )}

      {/* Node type */}
      {node.type && !isSeed && (
        <div style={{ fontSize: '9px', color: '#1e3a5f', marginTop: 'auto' }}>
          NODE TYPE · {node.type?.toUpperCase()}
          {node.round && ` · ROUND ${node.round}`}
        </div>
      )}
    </div>
  )
}

// ── Right Panel: Simulation Log ────────────────────────────────────────────────

function SimLog({ logs, round }) {
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  const levelColor = l => l === 'error' ? '#ef4444' : l === 'warn' ? '#f59e0b' : '#0ea5e9'
  const roundColor = r => r === 1 ? '#3b82f6' : r === 2 ? '#f59e0b' : r === 3 ? '#ef4444' : '#475569'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px', gap: '10px' }}>
      <div style={{ fontSize: '10px', color: '#334155', letterSpacing: '0.12em', fontFamily: 'monospace', flexShrink: 0 }}>
        SIM LOG · 知识图谱生长日志
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {logs.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#1e3a5f', padding: '16px 0', textAlign: 'center' }}>
            点击「▶ 启动模拟」开始推演…
          </div>
        ) : logs.map((log, i) => (
          <div key={i} style={{ display: 'flex', gap: '7px', padding: '3px 0', borderBottom: '1px solid #080f1a', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '9px', color: '#1e3a5f', fontFamily: 'monospace', flexShrink: 0, paddingTop: '1px' }}>
              {log.time}
            </span>
            {log.round > 0 && (
              <span style={{ fontSize: '8px', color: roundColor(log.round), background: `${roundColor(log.round)}18`, padding: '1px 4px', borderRadius: '1px', flexShrink: 0 }}>
                R{log.round}
              </span>
            )}
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: levelColor(log.level), flexShrink: 0, marginTop: '3px', boxShadow: `0 0 4px ${levelColor(log.level)}` }} />
            <span style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.5 }}>{log.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {round >= 3 && (
        <div style={{ padding: '10px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '3px', flexShrink: 0 }}>
          <div style={{ fontSize: '9px', color: '#f59e0b', letterSpacing: '0.1em', marginBottom: '4px' }}>推演结论</div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.6 }}>
            主路径：<span style={{ color: '#f59e0b' }}>代理人冲突</span> + <span style={{ color: '#0ea5e9' }}>外交降级</span> 并行<br/>
            整体置信度 <span style={{ color: '#22c55e', fontWeight: 700 }}>0.76</span> · 图谱节点 <span style={{ color: '#f59e0b' }}>27</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function WorldSim() {
  const [graphData, setGraphData]   = useState(() => buildInitialGraph())
  const [round, setRound]           = useState(0)
  const [running, setRunning]       = useState(false)
  const [activeAgentId, setActiveAgentId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [visibleLogs, setVisibleLogs] = useState([])
  const runningRef = useRef(false)

  const selectedNode = graphData.nodes.find(n => n.id === selectedId)

  const handleStart = useCallback(async () => {
    if (running || round >= 3) return
    runningRef.current = true
    setRunning(true)

    // Add seed logs first if round 0
    if (round === 0) {
      for (const log of SIM_LOGS.filter(l => l.round === 0)) {
        if (!runningRef.current) break
        setVisibleLogs(prev => [...prev, log])
        await sleep(500)
      }
    }

    for (let ri = round; ri < SIM_ROUNDS.length; ri++) {
      if (!runningRef.current) break
      const simRound = SIM_ROUNDS[ri]
      setRound(ri + 1)

      for (let ni = 0; ni < simRound.nodes.length; ni++) {
        if (!runningRef.current) break
        const vNode = { ...simRound.nodes[ni], virtual: true, round: ri + 1, r: 14 }
        const vEdge = { ...simRound.edges[ni], virtual: true, agentId: vNode.agentId }

        setActiveAgentId(vNode.agentId)
        await sleep(300)

        setGraphData(prev => ({
          nodes: [...prev.nodes, vNode],
          links: [...prev.links, vEdge],
        }))

        // Add matching log
        const matchLog = SIM_LOGS.find(l => l.round === ri + 1 && l.text.includes(
          SIM_AGENTS.find(a => a.id === vNode.agentId)?.shortName ?? '___'
        ))
        if (matchLog) setVisibleLogs(prev => [...prev, matchLog])

        await sleep(600)
      }

      setActiveAgentId(null)

      // Round summary log
      const summaryLog = SIM_LOGS.find(l => l.round === ri + 1 && l.text.includes('轮次 ' + (ri + 1) + ' 完成'))
      if (summaryLog) setVisibleLogs(prev => [...prev, summaryLog])

      if (ri < SIM_ROUNDS.length - 1) await sleep(1200)
    }

    // Final log
    if (runningRef.current) {
      const finalLog = SIM_LOGS[SIM_LOGS.length - 1]
      setVisibleLogs(prev => [...prev, finalLog])
    }

    runningRef.current = false
    setRunning(false)
  }, [running, round])

  const handleStop = useCallback(() => {
    runningRef.current = false
    setRunning(false)
    setActiveAgentId(null)
  }, [])

  const roundLabels = ['种子事件', '即时反应 T+0~2h', '次级响应 T+2~12h', '态势收敛 T+12~72h']

  return (
    <div style={{
      display: 'flex', height: '100%', flexDirection: 'column', overflow: 'hidden',
      background: '#040810', color: '#e2e8f0', fontFamily: 'var(--font-mono, monospace)',
    }}>
      {/* Top bar */}
      <div style={{
        height: '40px', flexShrink: 0,
        borderBottom: '1px solid #1a2d45',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '16px',
        background: 'rgba(4,8,16,0.96)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#f59e0b', fontSize: '13px' }}>◈</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.1em' }}>WORLD SIM</span>
          <span style={{ fontSize: '10px', color: '#1e3a5f' }}>·</span>
          <span style={{ fontSize: '10px', color: '#334155' }}>多Agent地缘博弈推演</span>
        </div>

        {/* Round label */}
        <div style={{ fontSize: '10px', color: '#475569', marginLeft: '8px', padding: '2px 10px', border: '1px solid #1a2d45', borderRadius: '2px' }}>
          {roundLabels[Math.min(round, 3)]}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block',
            background: running ? '#22c55e' : round >= 3 ? '#f59e0b' : '#334155',
            boxShadow: running ? '0 0 8px #22c55e' : 'none', transition: 'all 0.3s',
          }} />
          <span style={{ fontSize: '10px', color: '#475569' }}>
            {running ? '推演中' : round >= 3 ? '完成' : '就绪'}
          </span>
          <span style={{ fontSize: '10px', color: '#1e3a5f' }}>·</span>
          <span style={{ fontSize: '10px', color: '#334155' }}>
            虚线节点 = 大模型虚拟推演 · 实线节点 = 信实链已验证
          </span>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left */}
        <AgentPanel
          activeAgentId={activeAgentId}
          round={round}
          running={running}
          onStart={handleStart}
          onStop={handleStop}
          nodeCount={graphData.nodes.length}
        />

        {/* Center: graph */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Grid */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(#0a1628 1px, transparent 1px), linear-gradient(90deg, #0a1628 1px, transparent 1px)',
            backgroundSize: '32px 32px', opacity: 0.4,
          }} />
          <SimGraph
            graphData={graphData}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '16px', fontSize: '9px', color: '#1e3a5f',
            pointerEvents: 'none',
          }}>
            <span style={{ borderBottom: '1.5px solid #475569' }}>─── 已确认连接</span>
            <span style={{ borderBottom: '1.5px dashed #334155' }}>- - - 虚拟推演</span>
            <span style={{ color: '#f59e0b' }}>◉ 种子事件</span>
            <span>○ 角色节点</span>
            <span style={{ fontStyle: 'italic' }}>⬡ 推演动作</span>
          </div>
        </div>

        {/* Right */}
        <div style={{ width: '340px', flexShrink: 0, borderLeft: '1px solid #1a2d45', overflow: 'hidden', background: '#040810' }}>
          {selectedNode ? (
            <NodeDetail node={selectedNode} onClose={() => setSelectedId(null)} />
          ) : (
            <SimLog logs={visibleLogs} round={round} />
          )}
        </div>
      </div>
    </div>
  )
}
