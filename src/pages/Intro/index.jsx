import { useEffect, useRef, useState } from 'react'

const COPY = {
  tagline: '眼见为实',
  sub: 'WITNESS · REMOTE SENSING INTELLIGENCE PLATFORM',
  desc: '144颗多轨高分遥感卫星，小时级重访全球任意目标\n卫星影像交叉验证 · 构建不可篡改的信实情报库\n从已知事实出发，大模型推演未来72小时地缘走向',
  features: [
    { icon: '◎', zh: '态势分析', en: 'SITUATION MAP',  desc: '实时卫星影像叠加' },
    { icon: '⬡', zh: '信实链',   en: 'EVENT CHAIN',   desc: '多源交叉验证' },
    { icon: '◈', zh: '世界模拟', en: 'WORLD SIM',     desc: 'Multi-Agent博弈推演' },
    { icon: '▣', zh: '智能预测', en: 'INTEL REPORT',  desc: '大模型情报合成' },
  ],
  stats: [
    { value: '144',  unit: '颗',   label: '在轨卫星' },
    { value: '1.2h', unit: '',     label: '全球重访周期' },
    { value: '0.3m', unit: '分辨率', label: '最高地面分辨率' },
    { value: '99.1', unit: '%',    label: '验证置信度' },
  ],
  enter: '进入系统',
}

// Satellite orbital parameters [angle_offset_deg, orbit_radius_ratio, speed_factor, color_opacity]
const ORBITS = [
  { tilt: 0,   r: 0.32, speed: 0.8,  color: '#f59e0b', opacity: 0.7 },
  { tilt: 47,  r: 0.41, speed: 0.55, color: '#0ea5e9', opacity: 0.6 },
  { tilt: -33, r: 0.50, speed: 0.38, color: '#22c55e', opacity: 0.5 },
  { tilt: 72,  r: 0.61, speed: 0.25, color: '#8b5cf6', opacity: 0.4 },
]

// Satellites per orbit, with initial phase offset
const SATS_PER_ORBIT = [3, 4, 5, 4]

function toRad(deg) { return deg * Math.PI / 180 }

export default function Intro({ onEnter }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const [exiting, setExiting] = useState(false)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 300)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // Build satellite state
    const sats = []
    ORBITS.forEach((orb, oi) => {
      const count = SATS_PER_ORBIT[oi]
      for (let i = 0; i < count; i++) {
        sats.push({
          orb,
          phase: (i / count) * Math.PI * 2,
          beamActive: Math.random() > 0.5,
          beamTimer: Math.random() * 120,
        })
      }
    })

    let t = 0
    function draw() {
      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2
      const earthR = Math.min(W, H) * 0.14

      ctx.clearRect(0, 0, W, H)

      // Deep space glow
      const grad = ctx.createRadialGradient(cx, cy, earthR * 0.5, cx, cy, Math.min(W, H) * 0.65)
      grad.addColorStop(0, 'rgba(14,30,55,0.18)')
      grad.addColorStop(1, 'rgba(4,8,16,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Draw orbit ellipses
      ORBITS.forEach(orb => {
        const rx = Math.min(W, H) * orb.r
        const ry = rx * 0.38
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(toRad(orb.tilt))
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${orb.color === '#f59e0b' ? '245,158,11' : orb.color === '#0ea5e9' ? '14,165,233' : orb.color === '#22c55e' ? '34,197,94' : '139,92,246'},${orb.opacity * 0.25})`
        ctx.lineWidth = 0.7
        ctx.setLineDash([3, 6])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      })

      // Draw Earth
      const earthGrad = ctx.createRadialGradient(cx - earthR * 0.25, cy - earthR * 0.25, 0, cx, cy, earthR)
      earthGrad.addColorStop(0, '#1a3a6e')
      earthGrad.addColorStop(0.5, '#0d1f3c')
      earthGrad.addColorStop(1, '#060c18')
      ctx.beginPath()
      ctx.arc(cx, cy, earthR, 0, Math.PI * 2)
      ctx.fillStyle = earthGrad
      ctx.fill()
      // Earth glow
      const glowGrad = ctx.createRadialGradient(cx, cy, earthR * 0.8, cx, cy, earthR * 1.4)
      glowGrad.addColorStop(0, 'rgba(14,165,233,0.12)')
      glowGrad.addColorStop(1, 'rgba(14,165,233,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, earthR * 1.4, 0, Math.PI * 2)
      ctx.fillStyle = glowGrad
      ctx.fill()
      // Earth grid lines
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, earthR, 0, Math.PI * 2)
      ctx.clip()
      ctx.strokeStyle = 'rgba(14,165,233,0.08)'
      ctx.lineWidth = 0.5
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = cy + (lat / 90) * earthR
        const halfW = Math.sqrt(Math.max(0, earthR * earthR - (y - cy) ** 2))
        ctx.beginPath()
        ctx.moveTo(cx - halfW, y)
        ctx.lineTo(cx + halfW, y)
        ctx.stroke()
      }
      for (let lon = 0; lon < 360; lon += 45) {
        const rx = Math.abs(earthR * Math.sin(toRad(lon)))
        if (rx < 0.5) continue
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, earthR, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()

      // Draw satellites and scan beams
      sats.forEach(sat => {
        const orb = sat.orb
        const rx = Math.min(W, H) * orb.r
        const ry = rx * 0.38
        const angle = sat.phase + t * orb.speed * 0.008

        // 3D ellipse position
        const ex = rx * Math.cos(angle)
        const ey = ry * Math.sin(angle)

        // Apply tilt rotation
        const tiltR = toRad(orb.tilt)
        const sx = cx + ex * Math.cos(tiltR) - ey * Math.sin(tiltR)
        const sy = cy + ex * Math.sin(tiltR) + ey * Math.cos(tiltR)

        // Depth factor for size variation
        const depth = (ey / ry + 1) / 2
        const satR = 2.5 + depth * 1.5

        // Satellite body
        const satAlpha = 0.5 + depth * 0.5
        ctx.beginPath()
        ctx.arc(sx, sy, satR, 0, Math.PI * 2)
        ctx.fillStyle = orb.color + Math.round(satAlpha * 255).toString(16).padStart(2, '0')
        ctx.fill()

        // Satellite glow
        const sgGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, satR * 3)
        sgGrad.addColorStop(0, orb.color + '44')
        sgGrad.addColorStop(1, orb.color + '00')
        ctx.beginPath()
        ctx.arc(sx, sy, satR * 3, 0, Math.PI * 2)
        ctx.fillStyle = sgGrad
        ctx.fill()

        // Scan beam
        sat.beamTimer++
        if (sat.beamTimer > 80) {
          sat.beamActive = !sat.beamActive
          sat.beamTimer = 0
        }
        if (sat.beamActive) {
          const beamProgress = sat.beamTimer / 80
          const beamAlpha = Math.sin(beamProgress * Math.PI) * 0.35 * satAlpha
          // Find point on Earth surface toward satellite
          const dx = sx - cx
          const dy = sy - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const nx = dx / dist
          const ny = dy / dist
          const targetX = cx + nx * earthR
          const targetY = cy + ny * earthR

          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(targetX, targetY)
          ctx.strokeStyle = orb.color + Math.round(beamAlpha * 255).toString(16).padStart(2, '0')
          ctx.lineWidth = 0.8
          ctx.stroke()

          // Impact dot
          ctx.beginPath()
          ctx.arc(targetX, targetY, 2.5, 0, Math.PI * 2)
          ctx.fillStyle = orb.color + Math.round(beamAlpha * 1.5 * 255).toString(16).padStart(2, '0')
          ctx.fill()
        }
      })

      t++
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [])

  function handleEnter() {
    setExiting(true)
    setTimeout(onEnter, 700)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#040810',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      opacity: exiting ? 0 : 1,
      transition: 'opacity 0.7s ease',
      zIndex: 9999,
    }}>
      {/* Animated canvas background */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* Scanline overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '0',
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'none' : 'translateY(16px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
        padding: '0 24px',
        maxWidth: '680px', width: '100%',
        textAlign: 'center',
      }}>
        {/* Classification badge */}
        <div style={{
          fontSize: '9px', letterSpacing: '0.25em', color: '#1e3a5f',
          border: '1px solid #1a2d45', padding: '3px 12px', marginBottom: '28px',
          fontFamily: 'var(--font-mono)',
        }}>
          REMOTE SENSING INTELLIGENCE · UNCLASSIFIED DEMO
        </div>

        {/* Logo mark */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px',
            border: '2px solid #f59e0b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', color: '#f59e0b',
            fontFamily: 'var(--font-display)',
            boxShadow: '0 0 24px rgba(245,158,11,0.3), inset 0 0 12px rgba(245,158,11,0.05)',
          }}>W</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: '32px', letterSpacing: '0.2em', color: '#e2e8f0',
              lineHeight: 1,
            }}>WITNESS</div>
            <div style={{ fontSize: '9px', color: '#334155', letterSpacing: '0.15em', marginTop: '4px' }}>
              v0.1 DEMO
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '64px', color: '#f59e0b',
          letterSpacing: '0.16em',
          textShadow: '0 0 60px rgba(245,158,11,0.55), 0 0 120px rgba(245,158,11,0.2)',
          marginBottom: '10px',
          lineHeight: 1,
        }}>
          {COPY.tagline}
        </div>
        <div style={{
          fontSize: '11px', color: '#475569', letterSpacing: '0.22em', marginBottom: '28px',
          borderTop: '1px solid #1a2d45', borderBottom: '1px solid #1a2d45',
          padding: '6px 0',
        }}>
          {COPY.sub}
        </div>

        {/* Description */}
        <div style={{
          fontSize: '13px', color: '#94a3b8', lineHeight: 2,
          letterSpacing: '0.05em', marginBottom: '32px',
          whiteSpace: 'pre-line',
        }}>
          {COPY.desc}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: '0', marginBottom: '32px',
          border: '1px solid #1a2d45',
          width: '100%',
        }}>
          {COPY.stats.map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: '12px 0',
              borderRight: i < COPY.stats.length - 1 ? '1px solid #1a2d45' : 'none',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#f59e0b', letterSpacing: '0.05em' }}>
                {s.value}<span style={{ fontSize: '11px', color: '#94a3b8' }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '36px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {COPY.features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px',
              border: '1px solid #1a2d45',
              background: 'rgba(13,26,46,0.6)',
              fontSize: '11px',
            }}>
              <span style={{ color: '#f59e0b', opacity: 0.8 }}>{f.icon}</span>
              <span style={{ color: '#94a3b8' }}>{f.zh}</span>
              <span style={{ color: '#334155', fontSize: '9px', letterSpacing: '0.1em' }}>{f.en}</span>
            </div>
          ))}
        </div>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          style={{
            padding: '12px 48px',
            background: 'transparent',
            border: '1px solid #f59e0b',
            color: '#f59e0b',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px', letterSpacing: '0.2em',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 0 16px rgba(245,158,11,0.15)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(245,158,11,0.1)'
            e.currentTarget.style.boxShadow = '0 0 24px rgba(245,158,11,0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.boxShadow = '0 0 16px rgba(245,158,11,0.15)'
          }}
        >
          {COPY.enter} →
        </button>

        {/* Bottom micro-text */}
        <div style={{ marginTop: '24px', fontSize: '9px', color: '#1a2d45', letterSpacing: '0.15em' }}>
          CONSTELLATION COVERAGE · CROSS-SOURCE VERIFICATION · PREDICTIVE INTELLIGENCE
        </div>
      </div>
    </div>
  )
}
