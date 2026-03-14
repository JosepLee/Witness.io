import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SITES, EVENTS, NEWS_MARKERS, OSINT_EVENTS } from '../../data/mockData'

// ── 状态颜色 ───────────────────────────────S──────────────────
function statusColor(status) {
  if (status === 'operational') return '#22c55e'
  if (status === 'damaged')     return '#f59e0b'
  return '#ef4444'
}

function statusLabel(status) {
  if (status === 'operational') return '运行中'
  if (status === 'damaged')     return '受损'
  return '被摧毁'
}

// ── 左侧基地列表 ──────────────────────────────────────────────
function BaseList({ sites, selectedId, onSelect }) {
  const [filter, setFilter] = useState('all')
  const filters = [
    { key: 'all',         label: '全部' },
    { key: 'operational', label: '运行中' },
    { key: 'damaged',     label: '受损' },
    { key: 'destroyed',   label: '被摧毁' },
  ]
  const visible = filter === 'all' ? sites : sites.filter(s => s.status === filter)

  return (
    <div style={{
      width: '220px', flexShrink: 0,
      background: '#040810', borderRight: '1px solid #1a2d45',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* 标题 */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a2d45' }}>
        <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '8px' }}>
          SITUATION MAP · 监控点位
        </div>
        {/* 筛选按钮 */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding: '3px 8px', borderRadius: '2px', cursor: 'pointer',
                fontSize: '9px', letterSpacing: '0.06em',
                background: filter === f.key ? '#f59e0b22' : 'transparent',
                border: `1px solid ${filter === f.key ? '#f59e0b' : '#1a2d45'}`,
                color: filter === f.key ? '#f59e0b' : '#64748b',
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* 基地列表 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {visible.map(site => {
          const isSelected = site.id === selectedId
          const sc = statusColor(site.status)
          return (
            <div key={site.id} onClick={() => onSelect(site.id)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: '1px solid #0d1a2e',
                borderLeft: `2px solid ${isSelected ? sc : 'transparent'}`,
                background: isSelected ? `${sc}0d` : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: sc, boxShadow: `0 0 4px ${sc}`,
                  flexShrink: 0,
                }} />
                <div style={{ fontSize: '11px', color: isSelected ? '#e2e8f0' : '#94a3b8', fontWeight: isSelected ? 600 : 400, lineHeight: 1.3 }}>
                  {site.name}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '15px' }}>
                <span style={{ fontSize: '9px', color: '#334155' }}>{site.country}</span>
                <span style={{ fontSize: '9px', color: sc }}>{statusLabel(site.status)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 底部数据流提示 */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #1a2d45', fontSize: '9px', color: '#1e3a5f', lineHeight: 1.6 }}>
        ◉ 卫星影像 → 事实基础层<br/>
        点位数据锚定信实链节点<br/>
        <span style={{ color: '#334155' }}>◈ {OSINT_EVENTS.length} 条开源情报待验证</span>
      </div>
    </div>
  )
}

// ── 颜色工具 ─────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

// ── 雷达图组件 ────────────────────────────────────────────────
function RadarChart({ site }) {
  const dims = [
    { label: '火力', value: site.combatScore },
    { label: '机动', value: Math.round(site.combatScore * 0.85) },
    { label: '防空', value: Math.round(site.combatScore * 0.72) },
    { label: '情报', value: Math.round(site.combatScore * 0.91) },
    { label: '后勤', value: Math.round(site.combatScore * 0.78) },
  ]
  const size = 140, cx = size / 2, cy = size / 2, r = 55
  const angles = dims.map((_, i) => (i / dims.length) * Math.PI * 2 - Math.PI / 2)
  const points = dims.map((d, i) => [
    cx + r * (d.value / 100) * Math.cos(angles[i]),
    cy + r * (d.value / 100) * Math.sin(angles[i]),
  ])
  const rings = [0.25, 0.5, 0.75, 1].map(ratio =>
    dims.map((_, i) => [cx + r * ratio * Math.cos(angles[i]), cy + r * ratio * Math.sin(angles[i])])
  )
  return (
    <svg width={size} height={size}>
      {rings.map((ring, ri) => (
        <polygon key={ri} points={ring.map(p => p.join(',')).join(' ')}
          fill="none" stroke="#1a2d45" strokeWidth={0.5} />
      ))}
      {dims.map((_, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={cx + r * Math.cos(angles[i])} y2={cy + r * Math.sin(angles[i])}
          stroke="#1a2d45" strokeWidth={0.5} />
      ))}
      <polygon
        points={points.map(p => p.join(',')).join(' ')}
        fill={`${scoreColor(site.combatScore)}33`}
        stroke={scoreColor(site.combatScore)}
        strokeWidth={1.5}
      />
      {dims.map((d, i) => (
        <text key={i}
          x={cx + (r + 14) * Math.cos(angles[i])}
          y={cy + (r + 14) * Math.sin(angles[i])}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={8} fill="#64748b" fontFamily="JetBrains Mono"
        >{d.label}</text>
      ))}
    </svg>
  )
}

// ── 趋势图组件 ────────────────────────────────────────────────
function TrendChart({ history, color }) {
  const W = 200, H = 50
  const max = 100, min = 0
  const pts = history.map((v, i) => [
    (i / (history.length - 1)) * W,
    H - ((v - min) / (max - min)) * H
  ])
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${W},${H} L0,${H} Z`} fill="url(#trendGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2} fill={color} />
      ))}
    </svg>
  )
}

// ── 新组件：DualScore ─────────────────────────────────────────
function DualScore({ aci, dci }) {
  const aciColor = aci >= 80 ? '#22c55e' : aci >= 60 ? '#f59e0b' : '#ef4444'
  const dciColor = dci >= 80 ? '#22c55e' : dci >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
      {[['ACI', '攻击能力指数', aci, aciColor], ['DCI', '防御能力指数', dci, dciColor]].map(([key, label, val, color]) => (
        <div key={key} style={{
          flex: 1, padding: '12px', borderRadius: '4px',
          background: `${color}11`, border: `1px solid ${color}44`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '4px' }}>{key}</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{val}</div>
          <div style={{ fontSize: '8px', color: '#334155', marginTop: '4px' }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

// ── 新组件：DualTrendChart ────────────────────────────────────
function DualTrendChart({ dailyData }) {
  const W = 280, H = 60
  const { dates, aci, dci } = dailyData
  const n = dates.length
  function toPath(values) {
    return values.map((v, i) => {
      const x = (i / (n - 1)) * W
      const y = H - (v / 100) * H
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#334155', marginBottom: '3px' }}>
        <span>{dates[0]}</span>
        <span style={{ display: 'flex', gap: '10px' }}>
          <span style={{ color: '#22c55e' }}>— ACI</span>
          <span style={{ color: '#0ea5e9' }}>— DCI</span>
        </span>
        <span>{dates[n - 1]}</span>
      </div>
      <svg width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
        {[0.25, 0.5, 0.75, 1].map(r => (
          <line key={r} x1={0} y1={H * (1 - r)} x2={W} y2={H * (1 - r)} stroke="#0d1a2e" strokeWidth={0.5} />
        ))}
        <path d={toPath(dci)} fill="none" stroke="#0ea5e9" strokeWidth={1.5} />
        <path d={toPath(aci)} fill="none" stroke="#22c55e" strokeWidth={1.5} />
        <circle cx={W} cy={H - (aci[n-1]/100)*H} r={3} fill="#22c55e" />
        <circle cx={W} cy={H - (dci[n-1]/100)*H} r={3} fill="#0ea5e9" />
      </svg>
    </div>
  )
}

// ── 新组件：DamageStatus ──────────────────────────────────────
function DamageStatus({ status }) {
  const map = {
    operational: { label: '完好无损', color: '#22c55e', icon: '✓' },
    damaged:     { label: '受损',     color: '#f59e0b', icon: '⚠' },
    destroyed:   { label: '严重损毁', color: '#ef4444', icon: '✕' },
  }
  const { label, color, icon } = map[status] || map.operational
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '2px',
      background: `${color}15`, border: `1px solid ${color}44`,
      fontSize: '10px', color,
    }}>
      <span>{icon}</span><span>{label}</span>
    </div>
  )
}

// ── 新组件：FacilitiesList ────────────────────────────────────
function FacilitiesList({ facilities }) {
  return (
    <div>
      {facilities.map((f, i) => (
        <div key={i} style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10px' }}>
            <span style={{ color: '#94a3b8' }}>{f.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {f.verified
                ? <span style={{ color: '#22c55e', fontSize: '9px' }}>✓ 卫星验证</span>
                : <span style={{ color: '#334155', fontSize: '9px' }}>◌ 待核实</span>}
              <span style={{ color: f.damage > 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                {f.damage > 0 ? `损毁 ${f.damage}%` : '完好'}
              </span>
            </span>
          </div>
          <div style={{ height: '3px', background: '#0d1a2e', borderRadius: '2px' }}>
            <div style={{
              width: `${f.damage}%`, height: '100%', borderRadius: '2px',
              background: f.damage > 60 ? '#ef4444' : f.damage > 20 ? '#f59e0b' : '#22c55e',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 新组件：RelatedEvents ─────────────────────────────────────
function RelatedEvents({ siteId, onNavigate }) {
  const related = EVENTS.filter(e => e.siteId === siteId && e.verified)
  if (!related.length) return null
  return (
    <div>
      <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '8px' }}>
        信实链关联事件 · 卫星已锚定
      </div>
      {related.map(e => (
        <div key={e.id} style={{
          padding: '8px 10px', marginBottom: '4px',
          background: '#080f1e', borderRadius: '3px',
          border: '1px solid #1e3a5f',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '10px', color: '#e2e8f0' }}>{e.label.replace('\n', ' ')}</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{e.date} · {e.source}</div>
          </div>
          <button onClick={onNavigate}
            style={{
              padding: '3px 8px', fontSize: '9px',
              background: '#22c55e15', border: '1px solid #22c55e44',
              color: '#22c55e', borderRadius: '2px', cursor: 'pointer',
            }}>
            → 链
          </button>
        </div>
      ))}
    </div>
  )
}

// ── 新闻弹窗组件 ────────────────────────────────────────────────
function NewsModal({ news, onClose }) {
  if (!news) return null
  
  const typeColor = {
    military: '#ef4444',
    verified: '#22c55e',
    news: '#f59e0b',
    infrastructure: '#0ea5e9',
  }[news.type] || '#94a3b8'
  
  const typeLabel = {
    military: '军事动态',
    verified: '已验证',
    news: '新闻报道',
    infrastructure: '基础设施',
  }[news.type] || '信息'

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999,
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: '#040810',
        border: '1px solid #1a2d45',
        borderRadius: '6px',
        padding: '24px',
        maxWidth: '500px',
        maxHeight: '70vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '3px',
              background: `${typeColor}22`,
              border: `1px solid ${typeColor}44`,
              color: typeColor,
              fontSize: '9px',
              fontWeight: 700,
              marginBottom: '8px',
              letterSpacing: '0.08em',
            }}>
              {typeLabel}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4 }}>
              {news.title}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '9px', color: '#64748b', borderBottom: '1px solid #0d1a2e', paddingBottom: '12px' }}>
          <span>📅 {news.date}</span>
          <span>📡 {news.source}</span>
        </div>

        <div style={{ fontSize: '11px', color: '#c7d2e0', lineHeight: 1.6 }}>
          {news.content}
        </div>

        <div style={{ marginTop: '16px', padding: '12px', background: '#0d1a2e', borderRadius: '3px', fontSize: '9px', color: '#94a3b8' }}>
          📍 {news.lat.toFixed(2)}° N, {news.lng.toFixed(2)}° E
        </div>
      </div>
    </div>
  )
}
// ── 新组件：OsintCard（地图浮层卡片）────────────────────────
function OsintCard({ event, onClose }) {
  if (!event) return null
  const confColor = event.confidence >= 0.7 ? '#22c55e'
    : event.confidence >= 0.45 ? '#f59e0b' : '#ef4444'
  const sourceTypeLabel = {
    social: '社交媒体', news: '新闻媒体',
    official: '官方声明', anonymous: '匿名信源',
  }[event.sourceType] || 'OSINT'
  return (
    <div style={{
      position: 'absolute', top: '14px', left: '50%',
      transform: 'translateX(-50%)',
      width: '320px', zIndex: 1100,
      background: '#080f1e',
      border: `1px solid ${confColor}66`,
      borderRadius: '4px',
      padding: '16px',
      boxShadow: `0 0 24px ${confColor}22`,
      pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '2px', background: '#f59e0b22', border: '1px solid #f59e0b44', color: '#f59e0b' }}>OSINT</span>
            <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '2px', background: '#1e3a5f', border: '1px solid #1a2d45', color: '#64748b' }}>链 {event.relatedChain}</span>
            <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '2px', background: '#0d1a2e', color: '#334155' }}>{sourceTypeLabel}</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3 }}>{event.title}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px', flexShrink: 0, marginLeft: '8px' }}>×</button>
      </div>
      <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '10px' }}>{event.content}</div>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '9px', color: '#64748b' }}>LLM 综合置信度</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: confColor, fontFamily: 'var(--font-display)' }}>{(event.confidence * 100).toFixed(0)}%</span>
        </div>
        <div style={{ height: '3px', background: '#0d1a2e', borderRadius: '2px' }}>
          <div style={{ width: `${event.confidence * 100}%`, height: '100%', background: confColor, borderRadius: '2px', transition: 'width 0.4s' }} />
        </div>
      </div>
      <div style={{ padding: '8px 10px', background: '#0d1a2e', borderRadius: '3px', fontSize: '9px', color: '#64748b', lineHeight: 1.6, marginBottom: '10px', borderLeft: `2px solid ${confColor}44` }}>
        <span style={{ color: '#334155' }}>AI 分析：</span>{event.llmAnalysis}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#334155' }}>
        <span>{event.source}</span>
        <span>{event.date}</span>
      </div>
    </div>
  )
}

// ── 地图组件 ─────────────────────────────────────────────────
function SiteMap({ sites, selectedId, onSelect, osintEvents, onOsintSelect }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})
  const newsMarkersRef = useRef({})
  const [selectedNews, setSelectedNews] = useState(null)

  useEffect(() => {
    if (mapInstance.current) return
    import('leaflet').then(L => {
      const map = L.map(mapRef.current, {
        center: [32, 48], zoom: 5,
        zoomControl: false,
      })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap ©CartoDB',
        subdomains: 'abcd', maxZoom: 19
      }).addTo(map)
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // 添加基地标记
      sites.forEach(site => {
        const color = statusColor(site.status)
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:24px;height:24px;
            border-radius:50%;
            background:${color}33;
            border:2px solid ${color};
            display:flex;align-items:center;justify-content:center;
            font-size:9px;color:${color};
            font-family:JetBrains Mono;font-weight:700;
            box-shadow:0 0 10px ${color}66;
            cursor:pointer;
          ">${site.aci}</div>`,
          iconSize: [24, 24], iconAnchor: [12, 12]
        })
        const marker = L.marker([site.lat, site.lng], { icon })
          .addTo(map)
          .on('click', () => onSelect(site.id))
        markersRef.current[site.id] = marker
      })

      // 添加新闻标记
      NEWS_MARKERS.forEach(newsItem => {
        const typeColor = {
          military: '#ef4444',
          verified: '#22c55e',
          news: '#f59e0b',
          infrastructure: '#0ea5e9',
        }[newsItem.type] || '#94a3b8'
        
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:20px;height:20px;
            border-radius:50%;
            background:${typeColor}22;
            border:2px solid ${typeColor};
            display:flex;align-items:center;justify-content:center;
            font-size:10px;
            box-shadow:0 0 8px ${typeColor}88;
            cursor:pointer;
          ">📰</div>`,
          iconSize: [20, 20], iconAnchor: [10, 10]
        })
        const marker = L.marker([newsItem.lat, newsItem.lng], { icon })
          .addTo(map)
          .on('click', () => setSelectedNews(newsItem))
        newsMarkersRef.current[newsItem.id] = marker
      })

      // OSINT 事件标记
      osintEvents.forEach(ev => {
        const conf = ev.confidence
        const c = conf >= 0.7 ? '#22c55e' : conf >= 0.45 ? '#f59e0b' : '#ef4444'
        const osintIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:16px;height:16px;
            border-radius:50%;
            background:${c}22;
            border:1.5px dashed ${c}88;
            display:flex;align-items:center;justify-content:center;
            font-size:8px;color:${c};
            font-family:JetBrains Mono;font-weight:700;
            cursor:pointer;
          ">${Math.round(conf * 100)}</div>`,
          iconSize: [16, 16], iconAnchor: [8, 8],
        })
        L.marker([ev.lat, ev.lng], { icon: osintIcon })
          .addTo(map)
          .on('click', (e) => { L.DomEvent.stopPropagation(e); onOsintSelect(ev) })
      })

      // 点击地图空白处关闭 OSINT 卡片
      map.on('click', () => onOsintSelect(null))

      mapInstance.current = map
    })
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !selectedId) return
    const site = sites.find(s => s.id === selectedId)
    if (site) mapInstance.current.flyTo([site.lat, site.lng], 7, { duration: 1 })
  }, [selectedId])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* 新闻弹窗 */}
      <NewsModal news={selectedNews} onClose={() => setSelectedNews(null)} />
    </div>
  )
}

// ── 主组件 ───────────────────────────────────────────────────
export default function SitePackage() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState(siteId || SITES[0].id)
  const [imgIdx, setImgIdx] = useState(0)
  const [selectedOsint, setSelectedOsint] = useState(null)

  const site = SITES.find(s => s.id === selectedId) || SITES[0]
  const color = scoreColor(site.combatScore)

  useEffect(() => {
    if (siteId) setSelectedId(siteId)
    setImgIdx(0)
  }, [siteId])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <BaseList sites={SITES} selectedId={selectedId} onSelect={id => { setSelectedId(id); setImgIdx(0) }} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* 地图 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <SiteMap
          sites={SITES}
          selectedId={selectedId}
          onSelect={id => { setSelectedId(id); setImgIdx(0); setSelectedOsint(null) }}
          osintEvents={OSINT_EVENTS}
          onOsintSelect={ev => setSelectedOsint(ev)}
        />
        <OsintCard event={selectedOsint} onClose={() => setSelectedOsint(null)} />

        {/* 图例 */}
        <div style={{
          position: 'absolute', top: '12px', left: '12px', zIndex: 1000,
          background: 'rgba(4,8,16,0.88)', border: '1px solid #1a2d45',
          padding: '10px 14px', borderRadius: '4px', backdropFilter: 'blur(8px)'
        }}>
          <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '6px', letterSpacing: '0.1em' }}>基地状态</div>
          {[
            ['#22c55e', '运行中'],
            ['#f59e0b', '受损'],
            ['#ef4444', '被摧毁'],
          ].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', fontSize: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
              <span style={{ color: c }}>{l}</span>
            </div>
          ))}
        </div>

        {/* 时间轴 */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: 'rgba(4,8,16,0.9)', borderTop: '1px solid #1a2d45',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', flexShrink: 0 }}>影像时间轴</div>
          <div style={{ display: 'flex', gap: '8px', flex: 1, overflowX: 'auto' }}>
            {site.imagery.map((img, i) => (
              <div key={i} onClick={() => setImgIdx(i)}
                style={{
                  flexShrink: 0, padding: '8px 14px', borderRadius: '3px', cursor: 'pointer',
                  background: imgIdx === i ? `${color}22` : '#080f1e',
                  border: `1px solid ${imgIdx === i ? color : '#1a2d45'}`,
                  transition: 'all 0.15s',
                }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: imgIdx === i ? color : '#94a3b8' }}>{img.date}</div>
                <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{img.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧详情 */}
      <div style={{
        width: '340px', flexShrink: 0,
        background: '#040810', borderLeft: '1px solid #1a2d45',
        overflowY: 'auto', padding: '16px',
      }}>
        {/* 基地头部 */}
        <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #1a2d45' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em' }}>
              {site.country} · {site.type}
            </div>
            <div style={{
              padding: '2px 8px', borderRadius: '2px', fontSize: '10px', fontWeight: 700,
              background: site.strategicValue === 'S' ? '#ef444422' : site.strategicValue === 'A' ? '#f59e0b22' : '#22c55e22',
              border: `1px solid ${site.strategicValue === 'S' ? '#ef4444' : site.strategicValue === 'A' ? '#f59e0b' : '#22c55e'}`,
              color: site.strategicValue === 'S' ? '#ef4444' : site.strategicValue === 'A' ? '#f59e0b' : '#22c55e',
            }}>
              {site.strategicValue} 级
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '10px' }}>{site.name}</div>
          <DamageStatus status={site.status} />
        </div>

        {/* ACI / DCI */}
        <DualScore aci={site.aci} dci={site.dci} />

        {/* 趋势图 */}
        <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #1a2d45' }}>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '8px' }}>能力趋势（7日）</div>
          <DualTrendChart dailyData={site.dailyData} />
        </div>

        {/* 雷达图 */}
        <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #1a2d45' }}>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '8px' }}>综合能力评估</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart site={site} />
          </div>
        </div>

        {/* 卫星影像 */}
        <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #1a2d45' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em' }}>点位影像</div>
            <div style={{ fontSize: '10px', color: statusColor(site.status) }}>
              验证置信度 {(site.imagery[imgIdx]?.score * 100).toFixed(0)}%
            </div>
          </div>
          <div style={{
            width: '100%', height: '140px', borderRadius: '4px',
            background: 'linear-gradient(135deg, #0d1a2e 0%, #1a2d45 50%, #0d1a2e 100%)',
            border: '1px solid #1a2d45',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ fontSize: '10px', color: '#334155', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', marginBottom: '4px', opacity: 0.3 }}>◉</div>
              <div>WMTS 影像加载点</div>
              <div style={{ fontSize: '9px', marginTop: '2px', color: '#1a2d45' }}>{site.name}</div>
              <div style={{ fontSize: '9px', color: '#1a2d45' }}>{site.imagery[imgIdx]?.date}</div>
            </div>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
              background: `linear-gradient(to right, transparent, ${statusColor(site.status)}88, transparent)`,
              animation: 'scanline 3s linear infinite',
            }} />
            <style>{`@keyframes scanline { 0%{top:0} 100%{top:100%} }`}</style>
          </div>
          <div style={{ marginTop: '6px', fontSize: '10px', color: '#94a3b8', lineHeight: 1.5 }}>
            <span style={{ color: '#64748b' }}>识别结果：</span>{site.imagery[imgIdx]?.desc}
          </div>
        </div>

        {/* 设施损毁 */}
        <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #1a2d45' }}>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '8px' }}>设施损毁评估</div>
          <FacilitiesList facilities={site.facilities} />
        </div>

        {/* 信实链关联 */}
        <RelatedEvents siteId={site.id} onNavigate={() => navigate('/chain')} />
      </div>
    </div>
    </div>
  )
}
