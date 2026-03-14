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
  if (n.type?.startsWith('seed')) return '#f59e0b'
  const ag = agentById(n.agentId)
  return ag?.color ?? '#64748b'
}

function typeIcon(type) {
  const map = { assessment: '◉', report: '▤', command: '⚡', intel: '◈', media: '◎', defense: '⬡', escalation: '▲', diplomacy: '◇', action: '▸' }
  return map[type] ?? '·'
}

function buildInitialGraph() {
  return {
    nodes: [
      ...SIM_SEED_NODES.map(n => ({ ...n, r: 26 })),
      ...SIM_AGENTS.map(a => ({ id: a.id, label: a.shortName, sublabel: a.role, type: 'agent', agentId: a.id, r: 20 })),
    ],
    links: [
      ...SIM_SEED_EDGES.map(e => ({ ...e })),
      ...SIM_AGENTS.map(a => ({ id: `init_${a.id}`, source: a.id, target: a.seedLink, virtual: false })),
    ],
  }
}

// ── D3 helpers (imperative, live outside component) ───────────────────────────

function setupDefs(svg) {
  const defs = svg.append('defs')
  defs.append('style').text(`
    @keyframes pulse-seed { 0% { r: 28px; opacity: 0.5; } 100% { r: 50px; opacity: 0; } }
    @keyframes node-in    { from { opacity: 0; } to { opacity: 1; } }
    .seed-pulse { animation: pulse-seed 2.5s ease-out infinite; transform-box: fill-box; transform-origin: center; }
    .node-new   { animation: node-in 0.45s ease-out both; }
  `)
  const mk = (id, color) =>
    defs.append('marker').attr('id', id).attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('refX', 5).attr('refY', 3).attr('orient', 'auto')
      .append('path').attr('d', 'M0,0 L0,6 L6,3 z').attr('fill', color).attr('opacity', 0.75)
  mk('arr-base', '#2a3f5a')
  SIM_AGENTS.forEach(a => mk(`arr-${a.id}`, a.color))
}

function paintLinks(g, links) {
  g.select('.links').selectAll('line').data(links, l => l.id)
    .join('line')
    .attr('stroke', l => {
      if (!l.virtual) return '#1a2d45'
      const srcId = typeof l.source === 'string' ? l.source : l.source?.id
      const ag = SIM_AGENTS.find(a => a.id === srcId) ?? SIM_AGENTS.find(a => a.id === l.agentId)
      return ag?.color ?? '#334155'
    })
    .attr('stroke-width', l => l.virtual ? 1 : 1.5)
    .attr('stroke-dasharray', l => l.virtual ? '5,4' : null)
    .attr('opacity', l => l.virtual ? 0.35 : 0.25)
    .attr('marker-end', l => {
      if (!l.virtual) return 'url(#arr-base)'
      const srcId = typeof l.source === 'string' ? l.source : l.source?.id
      const ag = SIM_AGENTS.find(a => a.id === srcId) ?? SIM_AGENTS.find(a => a.id === l.agentId)
      return ag ? `url(#arr-${ag.id})` : 'url(#arr-base)'
    })
}

function paintNodes(g, nodes, onSelectRef, sim) {
  g.select('.nodes').selectAll('g').data(nodes, n => n.id)
    .join(
      enter => {
        const ng = enter.append('g')
          .attr('cursor', 'pointer')
          .attr('class', 'node-new')
          .on('click', (event, n) => { event.stopPropagation(); onSelectRef.current(n.id) })
          .call(
            d3.drag()
              .on('start', (event, n) => { if (!event.active) sim.alphaTarget(0.3).restart(); n.fx = n.x; n.fy = n.y })
              .on('drag',  (event, n) => { n.fx = event.x; n.fy = event.y })
              .on('end',   (event, n) => { if (!event.active) sim.alphaTarget(0); n.fx = null; n.fy = null })
          )

        // Seed pulse ring
        ng.filter(n => n.type?.startsWith('seed'))
          .append('circle').attr('class', 'seed-pulse')
          .attr('r', 28).attr('fill', 'none').attr('stroke', '#f59e0b').attr('stroke-width', 1)

        // Main circle
        ng.append('circle')
          .attr('r', n => n.r ?? 14)
          .attr('fill', n => nodeColor(n))
          .attr('fill-opacity', n => n.type?.startsWith('seed') ? 0.18 : n.virtual ? 0.06 : 0.12)
          .attr('stroke', n => nodeColor(n))
          .attr('stroke-width', n => n.type?.startsWith('seed') ? 2 : 1.5)
          .attr('stroke-dasharray', n => n.virtual ? '5,3' : null)

        // Center icon / letter
        ng.append('text')
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('font-size', n => n.type?.startsWith('seed') ? 11 : 10)
          .attr('fill', n => nodeColor(n)).attr('font-family', 'monospace')
          .attr('opacity', n => n.virtual ? 0.7 : 0.9)
          .text(n => {
            if (n.type?.startsWith('seed')) return n.label.slice(0, 2)
            if (n.type === 'agent') return n.label.slice(0, 1)
            return typeIcon(n.type)
          })

        // Name label below
        ng.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', n => (n.r ?? 14) + 13)
          .attr('font-size', 9).attr('font-family', 'monospace')
          .attr('font-style', n => n.virtual ? 'italic' : 'normal')
          .attr('fill', n => n.type?.startsWith('seed') ? '#f59e0b' : n.virtual ? '#475569' : '#64748b')
          .text(n => { const l = n.label ?? ''; return l.length > 8 ? l.slice(0, 8) + '…' : l })

        // Probability label (round 3)
        ng.filter(n => n.probability != null)
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('y', n => (n.r ?? 14) + 24)
          .attr('font-size', 8).attr('font-family', 'monospace')
          .attr('fill', n => n.probability >= 0.6 ? '#f59e0b' : '#64748b')
          .text(n => `P=${(n.probability * 100).toFixed(0)}%`)

        return ng
      }
    )
}

function tick(g, links) {
  g.select('.links').selectAll('line')
    .attr('x1', l => l.source.x).attr('y1', l => l.source.y)
    .attr('x2', l => {
      const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      return l.target.x - dx / dist * ((l.target.r ?? 14) + 5)
    })
    .attr('y2', l => {
      const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      return l.target.y - dy / dist * ((l.target.r ?? 14) + 5)
    })
  g.select('.nodes').selectAll('g')
    .attr('transform', n => `translate(${n.x ?? 0},${n.y ?? 0})`)
}

// ── SimGraph ───────────────────────────────────────────────────────────────────

function SimGraph({ graphData, selectedId, onSelect }) {
  const svgRef      = useRef(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // D3 mutable state — NOT React state (mutations don't trigger re-render)
  const d = useRef({ sim: null, fl: null, g: null, nodes: [], links: [], W: 700, H: 500 })

  // Initialize once
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const s = d.current
    s.W = el.clientWidth || 700
    s.H = el.clientHeight || 500

    const svg = d3.select(el)
    svg.selectAll('*').remove()
    setupDefs(svg)

    s.g = svg.append('g')
    s.g.append('g').attr('class', 'links')
    s.g.append('g').attr('class', 'nodes')

    s.nodes = graphData.nodes.map(n => ({ ...n }))
    s.links = graphData.links.map(l => ({ ...l }))

    s.fl = d3.forceLink(s.links).id(n => n.id)
      .distance(l => {
        const src = typeof l.source === 'object' ? l.source : s.nodes.find(n => n.id === l.source)
        const tgt = typeof l.target === 'object' ? l.target : s.nodes.find(n => n.id === l.target)
        if (src?.type?.startsWith('seed') || tgt?.type?.startsWith('seed')) return 110
        return l.virtual ? 75 : 90
      })
      .strength(0.5)

    s.sim = d3.forceSimulation(s.nodes)
      .force('link',   s.fl)
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(s.W / 2, s.H / 2))
      .force('col',    d3.forceCollide(n => (n.r ?? 14) + 16))
      .on('tick', () => tick(s.g, s.links))

    paintLinks(s.g, s.links)
    paintNodes(s.g, s.nodes, onSelectRef, s.sim)

    svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', e => s.g.attr('transform', e.transform)))
    svg.on('click', () => onSelectRef.current(null))

    return () => s.sim?.stop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Incremental update — add only new nodes/links without resetting simulation
  useEffect(() => {
    const s = d.current
    if (!s.sim) return

    const knownNodes = new Set(s.nodes.map(n => n.id))
    const knownLinks = new Set(s.links.map(l => l.id))

    const newNodes = graphData.nodes.filter(n => !knownNodes.has(n.id))
    const newLinks = graphData.links.filter(l => !knownLinks.has(l.id))
    if (!newNodes.length && !newLinks.length) return

    // Position new virtual nodes near their source (parent) node
    newNodes.forEach(n => {
      const edge = newLinks.find(l => l.target === n.id)
      if (edge) {
        const src = s.nodes.find(nn => nn.id === edge.source)
        if (src?.x != null) {
          n.x = src.x + (Math.random() - 0.5) * 90
          n.y = src.y + (Math.random() - 0.5) * 90
        }
      }
      if (n.x == null) {
        n.x = s.W / 2 + (Math.random() - 0.5) * 120
        n.y = s.H / 2 + (Math.random() - 0.5) * 120
      }
      s.nodes.push({ ...n, r: n.r ?? 14 })
    })
    newLinks.forEach(l => s.links.push({ ...l }))

    // Update simulation data and gently restart (low alpha keeps existing nodes stable)
    s.sim.nodes(s.nodes)
    s.fl.links(s.links)
    s.sim.alpha(0.25).restart()

    paintLinks(s.g, s.links)
    paintNodes(s.g, s.nodes, onSelectRef, s.sim)

  }, [graphData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight selected node without touching simulation
  useEffect(() => {
    const s = d.current
    if (!s.g) return
    s.g.select('.nodes').selectAll('g')
      .attr('opacity', n => selectedId == null || n?.id === selectedId ? 1 : 0.15)
  }, [selectedId])

  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
}

// ── Left Panel ─────────────────────────────────────────────────────────────────

function AgentPanel({ activeAgentId, round, running, onStart, onStop, nodeCount }) {
  return (
    <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid #1a2d45', display: 'flex', flexDirection: 'column', background: '#040810' }}>
      {/* Round progress */}
      <div style={{ padding: '12px', borderBottom: '1px solid #1a2d45' }}>
        <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.12em', marginBottom: '6px' }}>模拟角色 · {SIM_AGENTS.length} AGENTS</div>
        <div style={{ display: 'flex', gap: '3px' }}>
          {['种子', '轮次1', '轮次2', '轮次3'].map((lbl, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ height: '3px', borderRadius: '1px', background: round >= i ? '#f59e0b' : '#1a2d45', transition: 'background 0.4s' }} />
              <div style={{ fontSize: '8px', color: round >= i ? '#f59e0b' : '#1e3a5f', marginTop: '3px', textAlign: 'center', transition: 'color 0.4s' }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {SIM_AGENTS.map(ag => {
          const active = ag.id === activeAgentId
          return (
            <div key={ag.id} style={{ padding: '7px 12px', borderLeft: `2px solid ${active ? ag.color : 'transparent'}`, background: active ? `${ag.color}0a` : 'transparent', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: ag.color, flexShrink: 0, boxShadow: active ? `0 0 6px ${ag.color}` : 'none', transition: 'box-shadow 0.2s' }} />
                <div style={{ fontSize: '11px', color: active ? '#e2e8f0' : '#64748b', flex: 1, transition: 'color 0.2s' }}>{ag.shortName}</div>
                {active && <div style={{ fontSize: '9px', color: ag.color, animation: 'blink 0.8s step-end infinite' }}>▶ 生成中</div>}
              </div>
              <div style={{ fontSize: '9px', color: '#1e3a5f', marginTop: '2px', marginLeft: '13px' }}>{ag.role}</div>
            </div>
          )
        })}
      </div>

      {/* Stats */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #0f1a2e', borderBottom: '1px solid #1a2d45' }}>
        {[['图谱节点', nodeCount, '#f59e0b'], ['虚拟节点', Math.max(0, nodeCount - 11), '#64748b']].map(([lbl, val, color]) => (
          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '2px' }}>
            <span style={{ color: '#334155' }}>{lbl}</span>
            <span style={{ color, fontFamily: 'monospace' }}>{val}</span>
          </div>
        ))}
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
          <button onClick={onStop} style={{ width: '100%', padding: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '11px', cursor: 'pointer', borderRadius: '2px' }}>
            ■ 停止模拟
          </button>
        )}
        <div style={{ fontSize: '9px', color: '#1e3a5f', marginTop: '6px', textAlign: 'center', lineHeight: 1.4 }}>
          {['以信实链验证事件为种子', '即时反应 T+0~2h', '次级响应 T+2~12h', '态势收敛 T+12~72h'][Math.min(round, 3)]}
        </div>
      </div>
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  )
}

// ── Right Panel: Node Detail ───────────────────────────────────────────────────

function NodeDetail({ node, onClose }) {
  const ag = agentById(node.agentId)
  const color = nodeColor(node)
  const isSeed = node.type?.startsWith('seed')

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
            {node.virtual && <span style={{ fontSize: '9px', color: '#475569', border: '1px dashed #334155', padding: '1px 5px', borderRadius: '2px', fontStyle: 'italic' }}>虚拟推演节点</span>}
            {isSeed && <span style={{ fontSize: '9px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '1px 5px', borderRadius: '2px' }}>已验证种子事件</span>}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>{node.label}</div>
          {node.sublabel && <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>{node.sublabel}</div>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '16px' }}>×</button>
      </div>

      <div style={{ background: '#040f1a', border: '1px solid #1a2d45', borderRadius: '4px', padding: '10px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.7, fontStyle: node.virtual ? 'italic' : 'normal' }}>
          {node.desc ?? node.sublabel ?? '—'}
        </div>
      </div>

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
    </div>
  )
}

// ── Right Panel: Sim Log ───────────────────────────────────────────────────────

function SimLog({ logs, round }) {
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])
  const levelColor = l => l === 'error' ? '#ef4444' : l === 'warn' ? '#f59e0b' : '#0ea5e9'
  const roundColor = r => [,'#3b82f6','#f59e0b','#ef4444'][r] ?? '#475569'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px', gap: '10px' }}>
      <div style={{ fontSize: '10px', color: '#334155', letterSpacing: '0.12em', fontFamily: 'monospace', flexShrink: 0 }}>
        SIM LOG · 知识图谱生长日志
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {logs.length === 0
          ? <div style={{ fontSize: '11px', color: '#1e3a5f', padding: '16px 0', textAlign: 'center' }}>点击「▶ 启动模拟」开始推演…</div>
          : logs.map((log, i) => (
            <div key={i} style={{ display: 'flex', gap: '7px', padding: '3px 0', borderBottom: '1px solid #080f1a', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '9px', color: '#1e3a5f', fontFamily: 'monospace', flexShrink: 0, paddingTop: '1px' }}>{log.time}</span>
              {log.round > 0 && (
                <span style={{ fontSize: '8px', color: roundColor(log.round), background: `${roundColor(log.round)}18`, padding: '1px 4px', borderRadius: '1px', flexShrink: 0 }}>R{log.round}</span>
              )}
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: levelColor(log.level), flexShrink: 0, marginTop: '3px', boxShadow: `0 0 4px ${levelColor(log.level)}` }} />
              <span style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.5 }}>{log.text}</span>
            </div>
          ))
        }
        <div ref={endRef} />
      </div>
      {round >= 3 && (
        <div style={{ padding: '10px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '3px', flexShrink: 0 }}>
          <div style={{ fontSize: '9px', color: '#f59e0b', letterSpacing: '0.1em', marginBottom: '4px' }}>推演结论</div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.6 }}>
            主路径：<span style={{ color: '#f59e0b' }}>代理人冲突</span> + <span style={{ color: '#0ea5e9' }}>外交降级</span> 并行<br />
            置信度 <span style={{ color: '#22c55e', fontWeight: 700 }}>0.76</span> · 图谱节点 <span style={{ color: '#f59e0b' }}>27</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function WorldSim() {
  const [graphData, setGraphData]     = useState(() => buildInitialGraph())
  const [round, setRound]             = useState(0)
  const [running, setRunning]         = useState(false)
  const [activeAgentId, setActive]    = useState(null)
  const [selectedId, setSelectedId]   = useState(null)
  const [visibleLogs, setVisibleLogs] = useState([])
  const runningRef = useRef(false)

  // Toggle selection
  const handleSelect = useCallback(id => setSelectedId(prev => prev === id ? null : id), [])

  // Lookup selected node from current graph
  const selectedNode = graphData.nodes.find(n => n.id === selectedId)

  const handleStart = useCallback(async () => {
    if (running || round >= 3) return
    runningRef.current = true
    setRunning(true)

    // Seed logs on first run
    if (round === 0) {
      for (const log of SIM_LOGS.filter(l => l.round === 0)) {
        if (!runningRef.current) break
        setVisibleLogs(prev => [...prev, log])
        await sleep(400)
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

        setActive(vNode.agentId)
        await sleep(280)

        // Add one node at a time — SimGraph handles incremental update
        setGraphData(prev => ({
          nodes: [...prev.nodes, vNode],
          links: [...prev.links, vEdge],
        }))

        const matchLog = SIM_LOGS.find(l =>
          l.round === ri + 1 &&
          l.text.includes(SIM_AGENTS.find(a => a.id === vNode.agentId)?.shortName ?? '___')
        )
        if (matchLog) setVisibleLogs(prev => [...prev, matchLog])

        await sleep(550)
      }

      setActive(null)
      const summaryLog = SIM_LOGS.find(l => l.round === ri + 1 && l.text.includes('轮次 ' + (ri + 1) + ' 完成'))
      if (summaryLog) setVisibleLogs(prev => [...prev, summaryLog])
      if (ri < SIM_ROUNDS.length - 1) await sleep(1000)
    }

    if (runningRef.current) setVisibleLogs(prev => [...prev, SIM_LOGS[SIM_LOGS.length - 1]])
    runningRef.current = false
    setRunning(false)
  }, [running, round])

  const handleStop = useCallback(() => {
    runningRef.current = false
    setRunning(false)
    setActive(null)
  }, [])

  const roundLabels = ['种子事件', '即时反应 T+0~2h', '次级响应 T+2~12h', '态势收敛 T+12~72h']

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', overflow: 'hidden', background: '#040810', color: '#e2e8f0', fontFamily: 'var(--font-mono, monospace)' }}>
      {/* Top bar */}
      <div style={{ height: '40px', flexShrink: 0, borderBottom: '1px solid #1a2d45', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', background: 'rgba(4,8,16,0.96)' }}>
        <span style={{ color: '#f59e0b', fontSize: '13px' }}>◈</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.1em' }}>WORLD SIM</span>
        <span style={{ fontSize: '10px', color: '#1e3a5f' }}>·</span>
        <span style={{ fontSize: '10px', color: '#334155' }}>多Agent地缘博弈推演</span>
        <div style={{ fontSize: '10px', color: '#475569', padding: '2px 10px', border: '1px solid #1a2d45', borderRadius: '2px' }}>
          {roundLabels[Math.min(round, 3)]}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block', background: running ? '#22c55e' : round >= 3 ? '#f59e0b' : '#334155', boxShadow: running ? '0 0 8px #22c55e' : 'none', transition: 'all 0.3s' }} />
          <span style={{ fontSize: '10px', color: '#475569' }}>{running ? '推演中' : round >= 3 ? '完成' : '就绪'}</span>
          <span style={{ fontSize: '10px', color: '#1e3a5f' }}>·</span>
          <span style={{ fontSize: '10px', color: '#1e3a5f' }}>虚线 = 大模型推演 · 实线 = 信实链已验证</span>
        </div>
      </div>

      {/* 3-column body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <AgentPanel
          activeAgentId={activeAgentId} round={round} running={running}
          onStart={handleStart} onStop={handleStop} nodeCount={graphData.nodes.length}
        />

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(#0a1628 1px, transparent 1px), linear-gradient(90deg, #0a1628 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.4 }} />
          <SimGraph graphData={graphData} selectedId={selectedId} onSelect={handleSelect} />
          <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '14px', fontSize: '9px', color: '#1e3a5f', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            <span>─── 已确认连接</span>
            <span>- - - 虚拟推演</span>
            <span style={{ color: '#f59e0b' }}>◉ 种子事件</span>
            <span>○ 角色节点</span>
            <span style={{ fontStyle: 'italic' }}>⬡ 推演动作</span>
          </div>
        </div>

        <div style={{ width: '340px', flexShrink: 0, borderLeft: '1px solid #1a2d45', overflow: 'hidden', background: '#040810' }}>
          {selectedNode
            ? <NodeDetail node={selectedNode} onClose={() => setSelectedId(null)} />
            : <SimLog logs={visibleLogs} round={round} />}
        </div>
      </div>
    </div>
  )
}
