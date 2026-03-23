import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as d3 from 'd3'
import { EVENTS, EDGES, CHAINS, chainScore } from '../../data/mockData'

// ─── 工具：score → 颜色 ───────────────────────────────────────
function scoreColor(score) {
  // 红(0) → 橙(0.5) → 绿(1)
  const r = score < 0.5
    ? 239
    : Math.round(239 - (score - 0.5) * 2 * (239 - 34))
  const g = score < 0.5
    ? Math.round(68 + score * 2 * (158 - 68))
    : Math.round(158 + (score - 0.5) * 2 * (197 - 158))
  const b = score < 0.5 ? 68 : Math.round(68 + (score - 0.5) * 2 * 30)
  return `rgb(${r},${g},${b})`
}

function scoreLabel(score) {
  if (score >= 0.9) return '卫星验证'
  if (score >= 0.7) return '高可信'
  if (score >= 0.5) return '中可信'
  return '低可信'
}

// ─── 事件详情面板 ─────────────────────────────────────────────
function EventPanel({ event, onClose, onJumpSite }) {
  if (!event) return null
  const color = scoreColor(event.score)
  return (
    <div style={{
      position: 'absolute', right: '16px', top: '16px',
      width: '300px',
      background: '#080f1e',
      border: `1px solid ${color}`,
      borderRadius: '4px',
      padding: '20px',
      zIndex: 100,
      boxShadow: `0 0 24px ${color}22`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.1em' }}>EVENT DETAIL</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>×</button>
      </div>

      <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '12px', lineHeight: 1.4 }}>
        {event.label.replace('\n', ' ')}
      </div>

      {/* 评分 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>可信度评分</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color }}>{(event.score * 100).toFixed(0)}%</span>
        </div>
        <div style={{ height: '4px', background: '#0d1a2e', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${event.score * 100}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.5s' }} />
        </div>
        <div style={{ fontSize: '10px', color, marginTop: '4px' }}>{scoreLabel(event.score)}</div>
      </div>

      {/* 元信息 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[
          ['信息源', event.source],
          ['时间', event.date],
          ['所属链', `链 ${event.chain}`],
          ['验证状态', event.verified ? '已验证' : '待验证'],
        ].map(([k, v]) => (
          <div key={k} style={{ background: '#0d1a2e', padding: '8px', borderRadius: '3px' }}>
            <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px', letterSpacing: '0.05em' }}>{k}</div>
            <div style={{ fontSize: '11px', color: event.verified && k === '验证状态' ? '#22c55e' : '#e2e8f0' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* 详情 */}
      <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '16px', padding: '10px', background: '#0d1a2e', borderRadius: '3px' }}>
        {event.detail}
      </div>

      {/* 跳转按钮 */}
      {event.verified && event.siteId && (
        <button
          onClick={() => onJumpSite(event.siteId)}
          style={{
            width: '100%', padding: '10px',
            background: 'transparent',
            border: '1px solid #22c55e',
            color: '#22c55e',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px',
            letterSpacing: '0.08em',
            fontFamily: 'var(--font-mono)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <span>◎</span> 查看态势分析 →
        </button>
      )}
    </div>
  )
}

// ─── 链信息卡片（左侧） ───────────────────────────────────────
function ChainCard({ chain, isActive, onClick }) {
  const score = chainScore(chain.id)
  const color = scoreColor(score)
  const nodes = EVENTS.filter(e => e.chain === chain.id)
  const verified = nodes.filter(e => e.verified).length
  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        borderRadius: '4px',
        border: `1px solid ${isActive ? color : '#1a2d45'}`,
        background: isActive ? `${color}08` : '#080f1e',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: isActive ? color : '#e2e8f0' }}>链 {chain.id}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color }}>{(score * 100).toFixed(0)}</span>
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>{chain.name}</div>
      <div style={{ height: '3px', background: '#0d1a2e', borderRadius: '2px', marginBottom: '6px' }}>
        <div style={{ width: `${score * 100}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <div style={{ fontSize: '10px', color: '#64748b' }}>
        {verified}/{nodes.length} 节点已验证
      </div>
    </div>
  )
}

// ─── 主组件 ──────────────────────────────────────────────────
export default function EventChain() {
  const svgRef = useRef(null)
  const navigate = useNavigate()
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [activeChain, setActiveChain] = useState(null) // null = 全部高亮
  const [tooltip, setTooltip] = useState(null)

  const handleJumpSite = useCallback((siteId) => {
    navigate(`/site/${siteId}`)
  }, [navigate])

  useEffect(() => {
    const container = svgRef.current.parentElement
    const W = container.clientWidth
    const H = container.clientHeight

    // 准备节点和边
    const nodes = EVENTS.map(e => ({ ...e }))
    const links = EDGES.map(e => ({ ...e }))

    const svg = d3.select(svgRef.current)
      .attr('width', W).attr('height', H)

    svg.selectAll('*').remove()

    // 背景网格
    const defs = svg.append('defs')
    const pattern = defs.append('pattern')
      .attr('id', 'grid').attr('width', 40).attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse')
    pattern.append('path').attr('d', 'M 40 0 L 0 0 0 40')
      .attr('fill', 'none').attr('stroke', '#1a2d45').attr('stroke-width', 0.5)
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'url(#grid)')

    // Arrow marker
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 18).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#334155')

    const g = svg.append('g')

    // Zoom
    svg.call(d3.zoom().scaleExtent([0.4, 2.5]).on('zoom', e => {
      g.attr('transform', e.transform)
    }))

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(120).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(55))
      .force('chain-group', () => {
        // Group chains loosely by vertical band
        const chainY = { A: H * 0.25, B: H * 0.55, C: H * 0.8 }
        nodes.forEach(n => {
          if (chainY[n.chain]) n.vy += (chainY[n.chain] - n.y) * 0.02
        })
      })

    // Links
    const link = g.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', d => d.crossChain ? '#334155' : '#1e3a5f')
      .attr('stroke-width', d => d.crossChain ? 1 : 1.5)
      .attr('stroke-dasharray', d => d.crossChain ? '4,4' : null)
      .attr('marker-end', 'url(#arrow)')
      .attr('opacity', 0.7)

    // Node groups
    const node = g.append('g').selectAll('g').data(nodes).join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    // Node outer ring (verified pulse)
    node.filter(d => d.verified).append('circle')
      .attr('r', 24)
      .attr('class', 'verified-pulse')
      .attr('fill', 'none')
      .attr('stroke', d => scoreColor(d.score))
      .attr('stroke-width', 1)
      .attr('opacity', 0.5)

    // Node body
    node.append('circle')
      .attr('r', 18)
      .attr('fill', d => `${scoreColor(d.score)}22`)
      .attr('stroke', d => scoreColor(d.score))
      .attr('stroke-width', d => d.verified ? 2 : 1.5)

    // Score arc
    node.each(function(d) {
      const el = d3.select(this)
      const arcGen = d3.arc().innerRadius(18).outerRadius(22).startAngle(0).endAngle(d.score * Math.PI * 2)
      el.append('path').attr('d', arcGen()).attr('fill', scoreColor(d.score)).attr('opacity', 0.8)
    })

    // Verified star indicator
    node.filter(d => d.verified).append('text')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('font-size', '10px').attr('fill', '#22c55e')
      .text('✓')

    // Label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '32px')
      .attr('font-size', '9px')
      .attr('fill', '#94a3b8')
      .attr('font-family', 'JetBrains Mono')
      .each(function(d) {
        const lines = d.label.split('\n')
        const el = d3.select(this)
        el.text(null)
        lines.forEach((line, i) => {
          el.append('tspan').attr('x', 0).attr('dy', i === 0 ? 0 : '1.2em').text(line)
        })
      })

    // Event ID badge
    node.append('text')
      .attr('text-anchor', 'middle').attr('dy', '-22px')
      .attr('font-size', '9px').attr('fill', '#64748b')
      .attr('font-family', 'JetBrains Mono')
      .text(d => d.id)

    // Interactions
    node
      .on('mouseenter', function(e, d) {
        d3.select(this).select('circle:nth-child(2)').attr('fill', `${scoreColor(d.score)}44`)
        setTooltip({ x: e.clientX, y: e.clientY, text: `${(d.score * 100).toFixed(0)}% · ${d.source}` })
      })
      .on('mousemove', (e) => {
        setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)
      })
      .on('mouseleave', function(e, d) {
        d3.select(this).select('circle:nth-child(2)').attr('fill', `${scoreColor(d.score)}22`)
        setTooltip(null)
      })
      .on('click', (e, d) => {
        e.stopPropagation()
        setSelectedEvent(d)
        // 高亮链
        const chainNodes = new Set(EVENTS.filter(n => n.chain === d.chain).map(n => n.id))
        node.select('circle:nth-child(2)').attr('opacity', n => chainNodes.has(n.id) ? 1 : 0.15)
        link.attr('opacity', l => {
          const s = typeof l.source === 'object' ? l.source.id : l.source
          const t = typeof l.target === 'object' ? l.target.id : l.target
          return (chainNodes.has(s) && chainNodes.has(t)) ? 1 : 0.08
        })
      })

    svg.on('click', () => {
      setSelectedEvent(null)
      node.select('circle:nth-child(2)').attr('opacity', 1)
      link.attr('opacity', 0.7)
    })

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [])

  // 链过滤高亮（侧边栏点击）
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    if (!activeChain) {
      svg.selectAll('g g').select('circle:nth-child(2)').attr('opacity', 1)
      svg.selectAll('g line').attr('opacity', 0.7)
      return
    }
    const chainNodes = new Set(EVENTS.filter(n => n.chain === activeChain).map(n => n.id))
    svg.selectAll('g g').each(function(d) {
      if (!d) return
      d3.select(this).select('circle:nth-child(2)').attr('opacity', chainNodes.has(d.id) ? 1 : 0.1)
    })
    svg.selectAll('g line').each(function(d) {
      if (!d) return
      const s = typeof d.source === 'object' ? d.source.id : d.source
      const t = typeof d.target === 'object' ? d.target.id : d.target
      d3.select(this).attr('opacity', (chainNodes.has(s) && chainNodes.has(t)) ? 1 : 0.05)
    })
  }, [activeChain])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 0.1; }
        }
        .verified-pulse { animation: pulse-ring 2s ease-in-out infinite; }
      `}</style>
      {/* 左侧面板 */}
      <div style={{
        width: '240px', flexShrink: 0,
        background: '#040810',
        borderRight: '1px solid #1a2d45',
        padding: '16px',
        overflowY: 'auto',
      }}>
        <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.12em', marginBottom: '16px' }}>
          信实链
        </div>

        {/* 图例 */}
        <div style={{ marginBottom: '20px', padding: '12px', background: '#080f1e', borderRadius: '4px', border: '1px solid #1a2d45' }}>
          <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '8px', letterSpacing: '0.1em' }}>节点可信度</div>
          <div style={{ height: '6px', borderRadius: '3px', background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)', marginBottom: '6px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b' }}>
            <span>低可信</span><span>高可信</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '10px', color: '#22c55e' }}>
            <span>✓</span><span>卫星影像已验证</span>
          </div>
        </div>

        {/* 链卡片 */}
        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px', letterSpacing: '0.08em' }}>
          事件链 ({CHAINS.length})
        </div>
        <div
          onClick={() => setActiveChain(null)}
          style={{
            padding: '8px 12px', marginBottom: '8px',
            borderRadius: '4px', cursor: 'pointer',
            border: `1px solid ${!activeChain ? '#f59e0b' : '#1a2d45'}`,
            background: !activeChain ? '#f59e0b11' : 'transparent',
            fontSize: '11px', color: !activeChain ? '#f59e0b' : '#64748b',
          }}
        >全部显示</div>
        {CHAINS.map(chain => (
          <ChainCard
            key={chain.id}
            chain={chain}
            isActive={activeChain === chain.id}
            onClick={() => setActiveChain(activeChain === chain.id ? null : chain.id)}
          />
        ))}

        {/* 数据流说明 */}
        <div style={{
          marginTop: '12px', padding: '8px 10px',
          background: '#22c55e08', border: '1px solid #22c55e22',
          borderRadius: '3px', fontSize: '9px', color: '#1e3a5f', lineHeight: 1.6,
        }}>
          ✓ 卫星影像锚定节点（绿色）<br/>
          将提升整链置信度加权评分
        </div>

        {/* 统计 */}
        <div style={{ marginTop: '20px', padding: '12px', background: '#080f1e', borderRadius: '4px', border: '1px solid #1a2d45' }}>
          <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '10px', letterSpacing: '0.1em' }}>全局统计</div>
          {[
            ['总事件数', EVENTS.length],
            ['已验证', EVENTS.filter(e => e.verified).length],
            ['待验证', EVENTS.filter(e => !e.verified).length],
            ['跨链关联', EDGES.filter(e => e.crossChain).length],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
              <span style={{ color: '#64748b' }}>{k}</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 图谱区域 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />

        {/* 操作提示 */}
        <div style={{
          position: 'absolute', bottom: '16px', left: '16px',
          fontSize: '10px', color: '#334155',
          lineHeight: 1.8,
        }}>
          <div>滚轮缩放 · 拖拽移动节点 · 点击节点高亮链</div>
          <div>绿色节点 · 点击详情后可跳转态势分析</div>
        </div>

        {/* 事件详情面板 */}
        <EventPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onJumpSite={handleJumpSite}
        />

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10,
            background: '#080f1e', border: '1px solid #1a2d45',
            padding: '6px 10px', borderRadius: '3px',
            fontSize: '10px', color: '#94a3b8',
            pointerEvents: 'none', zIndex: 9999,
          }}>
            {tooltip.text}
          </div>
        )}
      </div>
    </div>
  )
}
