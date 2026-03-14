import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { SIM_AGENTS, SIM_INTERACTIONS, SIM_PHASES, SIM_LOGS } from '../../data/mockData'

// ── Color utilities ────────────────────────────────────────────────────────────

function agentColor(type) {
  if (type === 'military')      return '#ef4444'
  if (type === 'diplomatic')    return '#0ea5e9'
  if (type === 'government')    return '#f59e0b'
  if (type === 'international') return '#22c55e'
  return '#64748b'
}

function interactionColor(type) {
  if (type === 'strike')      return '#ef4444'
  if (type === 'retaliation') return '#f97316'
  if (type === 'deterrence')  return '#0ea5e9'
  if (type === 'intel')       return '#22c55e'
  if (type === 'diplomatic')  return '#8b5cf6'
  if (type === 'protest')     return '#f59e0b'
  if (type === 'inspection')  return '#64748b'
  return '#334155'
}

function threatColor(t) {
  if (t >= 0.8) return '#ef4444'
  if (t >= 0.5) return '#f59e0b'
  if (t >= 0.3) return '#0ea5e9'
  return '#22c55e'
}

// ── AgentList left panel ───────────────────────────────────────────────────────

function AgentList({ agents, selectedId, onSelect, phase, running, onStart, onStop }) {
  return (
    <div style={{
      width: '220px', flexShrink: 0,
      borderRight: '1px solid #1a2d45',
      display: 'flex', flexDirection: 'column',
      background: '#040810',
      overflow: 'hidden',
    }}>
      {/* Phase progress */}
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #1a2d45' }}>
        <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>
          模拟阶段
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {SIM_PHASES.map(p => (
            <div key={p.id} style={{ flex: 1 }}>
              <div style={{
                height: '3px',
                background: phase >= p.id ? '#f59e0b' : '#1a2d45',
                borderRadius: '2px',
                transition: 'background 0.4s',
              }} />
              <div style={{
                fontSize: '8px',
                color: phase >= p.id ? '#f59e0b' : '#334155',
                marginTop: '4px',
                textAlign: 'center',
                letterSpacing: '0.05em',
                transition: 'color 0.4s',
              }}>
                {p.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {agents.map(ag => (
          <div
            key={ag.id}
            onClick={() => onSelect(ag.id === selectedId ? null : ag.id)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              borderLeft: ag.id === selectedId ? '2px solid #f59e0b' : '2px solid transparent',
              background: ag.id === selectedId ? 'rgba(245,158,11,0.05)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: agentColor(ag.type), flexShrink: 0,
              }} />
              <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ag.name}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <div style={{ fontSize: '9px', color: '#475569', background: '#0f1a2e', padding: '1px 5px', borderRadius: '2px' }}>
                {ag.role}
              </div>
              <div style={{
                fontSize: '9px',
                padding: '1px 5px', borderRadius: '2px',
                background: ag.status === 'active' ? 'rgba(239,68,68,0.12)' :
                  ag.status === 'alert' ? 'rgba(249,115,22,0.12)' :
                  ag.status === 'monitoring' ? 'rgba(14,165,233,0.12)' :
                  'rgba(100,116,139,0.12)',
                color: ag.status === 'active' ? '#ef4444' :
                  ag.status === 'alert' ? '#f97316' :
                  ag.status === 'monitoring' ? '#0ea5e9' :
                  '#64748b',
              }}>
                {ag.status}
              </div>
            </div>
            {/* Threat bar */}
            <div style={{ height: '3px', background: '#0f1a2e', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${ag.threat * 100}%`,
                background: threatColor(ag.threat),
                transition: 'width 0.5s',
              }} />
            </div>
            <div style={{ fontSize: '9px', color: '#334155', marginTop: '2px', textAlign: 'right' }}>
              威胁 {(ag.threat * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      {/* Control buttons */}
      <div style={{ padding: '12px', borderTop: '1px solid #1a2d45' }}>
        {!running ? (
          <button
            onClick={onStart}
            disabled={phase === 3}
            style={{
              width: '100%', padding: '8px',
              background: phase === 3 ? '#1a2d45' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${phase === 3 ? '#1a2d45' : '#f59e0b'}`,
              color: phase === 3 ? '#334155' : '#f59e0b',
              fontSize: '11px', letterSpacing: '0.08em',
              cursor: phase === 3 ? 'default' : 'pointer',
              borderRadius: '2px',
              transition: 'all 0.15s',
            }}
          >
            {phase === 3 ? '✓ 模拟已完成' : '▶ 启动模拟'}
          </button>
        ) : (
          <button
            onClick={onStop}
            style={{
              width: '100%', padding: '8px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              fontSize: '11px', letterSpacing: '0.08em',
              cursor: 'pointer',
              borderRadius: '2px',
            }}
          >
            ■ 停止模拟
          </button>
        )}
        <div style={{ fontSize: '9px', color: '#1e3a5f', marginTop: '6px', textAlign: 'center' }}>
          {SIM_PHASES[Math.min(phase, 3)]?.desc}
        </div>
      </div>
    </div>
  )
}

// ── SimGraph D3 force-directed graph ───────────────────────────────────────────

function SimGraph({ agents, interactions, selectedId, onSelect }) {
  const svgRef = useRef(null)
  const simRef = useRef(null)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return

    const W = el.clientWidth || 600
    const H = el.clientHeight || 500

    const svg = d3.select(el)
    svg.selectAll('*').remove()

    // Inject animations
    svg.append('defs').html(`
      <style>
        @keyframes pulse-ring {
          0%   { r: 0; opacity: 0.6; }
          100% { r: 28px; opacity: 0; }
        }
        .agent-pulse {
          animation: pulse-ring 2s ease-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
      </style>
      ${interactions.map(d => `
        <marker id="arrow-${d.id}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="${interactionColor(d.type)}" opacity="0.8"/>
        </marker>
      `).join('')}
    `)

    const g = svg.append('g')

    // Deep copy nodes/links for D3 mutation
    const nodes = agents.map(a => ({ ...a }))
    const links = interactions.map(d => ({ ...d }))

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(130).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(d => 14 + d.threat * 16 + 20))

    simRef.current = sim

    // Edges
    const linkG = g.append('g')
    const link = linkG.selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => interactionColor(d.type))
      .attr('stroke-width', d => 1 + d.confidence * 1.5)
      .attr('stroke-dasharray', d => d.confidence < 0.7 ? '5,4' : null)
      .attr('opacity', 0.6)
      .attr('marker-end', d => `url(#arrow-${d.id})`)

    // Edge labels
    const edgeLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', 9)
      .attr('fill', d => interactionColor(d.type))
      .attr('opacity', 0.7)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'monospace')
      .text(d => d.label)

    // Node groups
    const nodeG = g.append('g')
    const node = nodeG.selectAll('g')
      .data(nodes)
      .join('g')
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
        .on('drag', (event, d) => {
          d.fx = event.x; d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0)
          d.fx = null; d.fy = null
        })
      )

    // Pulse ring (animated)
    node.append('circle')
      .attr('class', 'agent-pulse')
      .attr('r', 0)
      .attr('fill', 'none')
      .attr('stroke', d => agentColor(d.type))
      .attr('stroke-width', 1.5)
      .attr('opacity', 0)
      .style('animation-delay', (_, i) => `${i * 0.4}s`)

    // Main circle
    node.append('circle')
      .attr('r', d => 14 + d.threat * 16)
      .attr('fill', d => agentColor(d.type))
      .attr('fill-opacity', 0.15)
      .attr('stroke', d => agentColor(d.type))
      .attr('stroke-width', 1.5)

    // Center letter
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', 13)
      .attr('font-weight', 700)
      .attr('fill', d => agentColor(d.type))
      .attr('font-family', 'monospace')
      .text(d => d.name[0])

    // Node name label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', d => 14 + d.threat * 16 + 14)
      .attr('font-size', 10)
      .attr('fill', '#94a3b8')
      .attr('font-family', 'monospace')
      .text(d => d.name.length > 7 ? d.name.slice(0, 7) + '…' : d.name)

    // Tick
    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => {
          const dx = d.target.x - d.source.x
          const dy = d.target.y - d.source.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const r = 14 + d.target.threat * 16
          return dist ? d.target.x - dx / dist * (r + 6) : d.target.x
        })
        .attr('y2', d => {
          const dx = d.target.x - d.source.x
          const dy = d.target.y - d.source.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const r = 14 + d.target.threat * 16
          return dist ? d.target.y - dy / dist * (r + 6) : d.target.y
        })

      edgeLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 6)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.4, 3])
      .on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom)

    // Click background to deselect
    svg.on('click', () => onSelect(null))

    return () => {
      sim.stop()
    }
  }, [agents, interactions]) // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight selected node
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('g > g > g').each(function(d) {
      const isSelected = selectedId === null || d?.id === selectedId
      d3.select(this).attr('opacity', isSelected ? 1 : 0.2)
    })
  }, [selectedId])

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  )
}

// ── AgentDetail right panel ────────────────────────────────────────────────────

function AgentDetail({ agent, interactions, onClose }) {
  const outgoing = interactions.filter(i => i.source === agent.id)
  const incoming = interactions.filter(i => i.target === agent.id)
  const color = agentColor(agent.type)
  const tc = threatColor(agent.threat)

  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
            {agent.name}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ fontSize: '9px', color, background: `${color}18`, padding: '2px 6px', borderRadius: '2px' }}>
              {agent.role}
            </span>
            <span style={{ fontSize: '9px', color: '#475569', background: '#0f1a2e', padding: '2px 6px', borderRadius: '2px' }}>
              {agent.type}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '16px', padding: '0' }}
        >×</button>
      </div>

      {/* Threat score */}
      <div style={{ background: '#040f1a', border: '1px solid #1a2d45', borderRadius: '4px', padding: '10px' }}>
        <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '4px' }}>威胁评估</div>
        <div style={{ fontSize: '28px', fontWeight: 800, color: tc, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
          {(agent.threat * 100).toFixed(0)}%
        </div>
        <div style={{ height: '4px', background: '#1a2d45', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${agent.threat * 100}%`, background: tc }} />
        </div>
      </div>

      {/* Summary */}
      <div>
        <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>态势摘要</div>
        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.7 }}>{agent.summary}</div>
      </div>

      {/* Predicted actions */}
      <div>
        <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>预测行动</div>
        {agent.actions.map((action, i) => (
          <div key={i} style={{
            fontSize: '11px', color: '#cbd5e1',
            padding: '5px 8px', marginBottom: '4px',
            background: '#040f1a',
            borderLeft: `2px solid ${color}`,
          }}>
            {action}
          </div>
        ))}
      </div>

      {/* Interactions */}
      {outgoing.length > 0 && (
        <div>
          <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>发起交互</div>
          {outgoing.map(ix => (
            <div key={ix.id} style={{
              padding: '6px 8px', marginBottom: '4px',
              background: '#040f1a', border: '1px solid #1a2d45', borderRadius: '2px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ fontSize: '10px', color: interactionColor(ix.type) }}>{ix.label}</span>
                <span style={{ fontSize: '9px', color: '#334155' }}>{ix.timeWindow}</span>
              </div>
              <div style={{ fontSize: '9px', color: '#475569' }}>{ix.desc}</div>
            </div>
          ))}
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>接收交互</div>
          {incoming.map(ix => (
            <div key={ix.id} style={{
              padding: '6px 8px', marginBottom: '4px',
              background: '#040f1a', border: '1px solid #1a2d45', borderRadius: '2px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ fontSize: '10px', color: interactionColor(ix.type) }}>{ix.label}</span>
                <span style={{ fontSize: '9px', color: '#334155' }}>{ix.timeWindow}</span>
              </div>
              <div style={{ fontSize: '9px', color: '#475569' }}>{ix.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SimLog right panel ─────────────────────────────────────────────────────────

function SimLog({ logs, phase }) {
  const logEndRef = useRef(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const levelColor = lvl => lvl === 'error' ? '#ef4444' : lvl === 'warn' ? '#f59e0b' : '#0ea5e9'

  const lastLog = logs[logs.length - 1]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px', gap: '10px' }}>
      <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
        SIM LOG · 实时推演日志
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {logs.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#1e3a5f', padding: '12px 0', textAlign: 'center' }}>
            等待启动模拟…
          </div>
        ) : logs.map((log, i) => (
          <div key={i} style={{
            display: 'flex', gap: '8px', alignItems: 'flex-start',
            padding: '4px 0',
            borderBottom: '1px solid #0a1628',
          }}>
            <span style={{ fontSize: '9px', color: '#334155', fontFamily: 'monospace', flexShrink: 0, paddingTop: '1px' }}>
              {log.time}
            </span>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: levelColor(log.level),
              flexShrink: 0, marginTop: '3px',
              boxShadow: `0 0 4px ${levelColor(log.level)}`,
            }} />
            <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
              {log.text}
            </span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Summary footer */}
      {phase === 3 && lastLog && (
        <div style={{
          padding: '10px',
          background: 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '3px',
        }}>
          <div style={{ fontSize: '9px', color: '#f59e0b', letterSpacing: '0.1em', marginBottom: '4px' }}>
            模拟结论
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
            整体置信度 <span style={{ color: '#22c55e', fontWeight: 700 }}>0.79</span> · 主路径：<span style={{ color: '#f59e0b' }}>有限冲突后降级</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── WorldSim main component ────────────────────────────────────────────────────

export default function WorldSim() {
  const [phase, setPhase]           = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [running, setRunning]       = useState(false)
  const [visibleLogs, setVisibleLogs] = useState([])
  const timerRef = useRef([])

  const selectedAgent = SIM_AGENTS.find(a => a.id === selectedId)

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(t => clearTimeout(t))
    timerRef.current = []
  }, [])

  const handleStart = useCallback(() => {
    if (running || phase === 3) return
    setRunning(true)

    let logIdx = 0
    let currentPhase = phase

    // Stream logs with delay
    const streamLog = (delay) => {
      if (logIdx >= SIM_LOGS.length) return
      const t = setTimeout(() => {
        const log = SIM_LOGS[logIdx++]
        setVisibleLogs(prev => [...prev, log])
        streamLog(300)
      }, delay)
      timerRef.current.push(t)
    }

    // Phase progression
    const phaseDelays = [800, 2800, 5500, 9000]
    phaseDelays.slice(currentPhase + 1).forEach((delay, i) => {
      const nextPhase = currentPhase + 1 + i
      const t = setTimeout(() => {
        setPhase(nextPhase)
        if (nextPhase === 3) {
          setRunning(false)
        }
      }, delay)
      timerRef.current.push(t)
    })

    streamLog(200)
  }, [running, phase])

  const handleStop = useCallback(() => {
    clearTimers()
    setRunning(false)
  }, [clearTimers])

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers])

  const phaseLabel = SIM_PHASES[Math.min(phase, 3)]?.label ?? '初始化'

  return (
    <div style={{
      display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column',
      background: '#040810', color: '#e2e8f0',
      fontFamily: 'var(--font-mono, monospace)',
    }}>
      {/* Top status bar */}
      <div style={{
        height: '40px', flexShrink: 0,
        borderBottom: '1px solid #1a2d45',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '16px',
        background: 'rgba(4,8,16,0.95)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#f59e0b', fontSize: '13px' }}>◈</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.1em' }}>
            WORLD SIM
          </span>
          <span style={{ fontSize: '10px', color: '#334155' }}>·</span>
          <span style={{ fontSize: '10px', color: '#475569' }}>地缘博弈推演</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Phase indicators */}
          {SIM_PHASES.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {i > 0 && <span style={{ color: '#1a2d45', fontSize: '10px' }}>→</span>}
              <span style={{
                fontSize: '10px',
                color: phase >= p.id ? (phase === p.id ? '#f59e0b' : '#334155') : '#1e3a5f',
                fontWeight: phase === p.id ? 700 : 400,
                transition: 'color 0.4s',
              }}>
                {p.label}
              </span>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
            <span style={{
              display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
              background: running ? '#22c55e' : phase === 3 ? '#f59e0b' : '#334155',
              boxShadow: running ? '0 0 6px #22c55e' : 'none',
              transition: 'all 0.3s',
            }} />
            <span style={{ fontSize: '10px', color: '#475569' }}>
              {running ? '运行中' : phase === 3 ? '已完成' : '就绪'}
            </span>
          </div>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: agent list */}
        <AgentList
          agents={SIM_AGENTS}
          selectedId={selectedId}
          onSelect={setSelectedId}
          phase={phase}
          running={running}
          onStart={handleStart}
          onStop={handleStop}
        />

        {/* Center: D3 graph */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Grid overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(#0a1628 1px, transparent 1px), linear-gradient(90deg, #0a1628 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            opacity: 0.5,
          }} />
          <SimGraph
            agents={SIM_AGENTS}
            interactions={SIM_INTERACTIONS}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {/* Phase watermark */}
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
            fontSize: '10px', color: '#1e3a5f', letterSpacing: '0.15em', pointerEvents: 'none',
          }}>
            {phaseLabel.toUpperCase()} · {SIM_AGENTS.length} AGENTS · {SIM_INTERACTIONS.length} INTERACTIONS
          </div>
        </div>

        {/* Right: detail or log */}
        <div style={{
          width: '340px', flexShrink: 0,
          borderLeft: '1px solid #1a2d45',
          background: '#040810',
          overflow: 'hidden',
        }}>
          {selectedAgent ? (
            <AgentDetail
              agent={selectedAgent}
              interactions={SIM_INTERACTIONS}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <SimLog logs={visibleLogs} phase={phase} />
          )}
        </div>
      </div>
    </div>
  )
}
