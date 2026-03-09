import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SITES } from '../../data/mockData'

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

// ── 地图组件 ─────────────────────────────────────────────────
function SiteMap({ sites, selectedId, onSelect }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})

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

      sites.forEach(site => {
        const color = scoreColor(site.combatScore)
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
          ">${site.combatScore}</div>`,
          iconSize: [24, 24], iconAnchor: [12, 12]
        })
        const marker = L.marker([site.lat, site.lng], { icon })
          .addTo(map)
          .on('click', () => onSelect(site.id))
        markersRef.current[site.id] = marker
      })
      mapInstance.current = map
    })
  }, [])

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
}

// ── 主组件 ───────────────────────────────────────────────────
export default function SitePackage() {
  const { siteId } = useParams()
  const [selectedId, setSelectedId] = useState(siteId || SITES[0].id)
  const [imgIdx, setImgIdx] = useState(0)

  const site = SITES.find(s => s.id === selectedId) || SITES[0]
  const color = scoreColor(site.combatScore)

  useEffect(() => {
    if (siteId) setSelectedId(siteId)
    setImgIdx(0)
  }, [siteId])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* 地图 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <SiteMap sites={SITES} selectedId={selectedId} onSelect={id => { setSelectedId(id); setImgIdx(0) }} />

        {/* 图例 */}
        <div style={{
          position: 'absolute', top: '12px', left: '12px', zIndex: 1000,
          background: 'rgba(4,8,16,0.88)', border: '1px solid #1a2d45',
          padding: '10px 14px', borderRadius: '4px', backdropFilter: 'blur(8px)'
        }}>
          <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '6px', letterSpacing: '0.1em' }}>战斗力评分</div>
          {[['80+','#22c55e','高'], ['60-79','#f59e0b','中'], ['40-59','#f97316','低'], ['<40','#ef4444','危']].map(([r, c, l]) => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', fontSize: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
              <span style={{ color: '#94a3b8' }}>{r}</span>
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
        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #1a2d45' }}>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '6px' }}>
            {site.country} · {site.type}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', marginBottom: '12px' }}>{site.name}</div>
          {/* 战斗力大分数 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '4px',
              border: `2px solid ${color}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: `${color}11`,
            }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{site.combatScore}</div>
              <div style={{ fontSize: '8px', color: '#64748b' }}>战斗力</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>30天趋势</div>
              <TrendChart history={site.scoreHistory} color={color} />
            </div>
          </div>
        </div>

        {/* 雷达图 */}
        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #1a2d45' }}>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '10px' }}>综合能力评估</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart site={site} />
          </div>
        </div>

        {/* 当前影像 */}
        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #1a2d45' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em' }}>点位影像</div>
            <div style={{ fontSize: '10px', color }}>
              验证置信度 {(site.imagery[imgIdx]?.score * 100).toFixed(0)}%
            </div>
          </div>
          {/* 影像模拟区域 */}
          <div style={{
            width: '100%', height: '160px', borderRadius: '4px',
            background: 'linear-gradient(135deg, #0d1a2e 0%, #1a2d45 50%, #0d1a2e 100%)',
            border: '1px solid #1a2d45',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ fontSize: '10px', color: '#334155', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px', opacity: 0.3 }}>◉</div>
              <div>WMTS 影像加载点</div>
              <div style={{ fontSize: '9px', marginTop: '4px', color: '#1a2d45' }}>{site.name}</div>
              <div style={{ fontSize: '9px', color: '#1a2d45' }}>{site.imagery[imgIdx]?.date}</div>
            </div>
            {/* 扫描线动效 */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
              background: `linear-gradient(to right, transparent, ${color}88, transparent)`,
              animation: 'scanline 3s linear infinite',
            }} />
            <style>{`@keyframes scanline { 0%{top:0} 100%{top:100%} }`}</style>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
            <span style={{ color: '#64748b' }}>识别结果：</span>{site.imagery[imgIdx]?.desc}
          </div>
        </div>

        {/* 装备列表 */}
        <div>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '10px' }}>
            装备清单 · 大模型识别
          </div>
          {site.equipment.map((eq, i) => (
            <div key={i} style={{
              padding: '10px 12px', marginBottom: '6px',
              background: '#080f1e', borderRadius: '3px',
              border: `1px solid ${eq.verified ? '#1e3a5f' : '#1a2d45'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#e2e8f0', marginBottom: '2px' }}>{eq.name}</div>
                <div style={{ fontSize: '10px', color: eq.verified ? '#22c55e' : '#64748b' }}>
                  {eq.verified ? '✓ 影像确认' : '◌ 待核实'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>{eq.count}</div>
                <div style={{
                  fontSize: '10px',
                  color: eq.change.startsWith('+') ? '#22c55e' : eq.change.startsWith('-') ? '#ef4444' : '#64748b'
                }}>{eq.change}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
