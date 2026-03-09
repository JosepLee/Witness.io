import { useState, useEffect, useRef } from 'react'
import { REPORT } from '../../data/mockData'

// ── 置信度颜色 ────────────────────────────────────────────────
function confColor(c) {
  if (c >= 0.85) return '#22c55e'
  if (c >= 0.65) return '#f59e0b'
  if (c >= 0.45) return '#f97316'
  return '#ef4444'
}

// ── 流式文字效果 ─────────────────────────────────────────────
function StreamText({ text, speed = 18 }) {
  const [displayed, setDisplayed] = useState('')
  const idx = useRef(0)
  useEffect(() => {
    idx.current = 0
    setDisplayed('')
    const timer = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.slice(0, idx.current + 1))
        idx.current++
      } else {
        clearInterval(timer)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])
  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span style={{ animation: 'blink 0.8s step-end infinite', color: '#f59e0b' }}>▋</span>
      )}
    </span>
  )
}

// ── 2D 地球演示（Canvas）────────────────────────────────────
function GlobeDemo({ phase }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const phaseRef = useRef(phase)

  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height

    // 坐标转换（简化墨卡托）
    function toXY(lat, lng) {
      return [
        W * (lng + 180) / 360,
        H * (1 - (lat + 90) / 180),
      ]
    }

    // 目标点
    const SITES_POS = [
      { lat: 36.679, lng: 42.447, label: '塔尔阿夫尔', color: '#f59e0b' },
      { lat: 35.1,   lng: 43.9,   label: '侦察前进基地', color: '#0ea5e9' },
      { lat: 35.5,   lng: 45.1,   label: '胡拉玛(打击目标)', color: '#ef4444' },
      { lat: 34.8,   lng: 46.2,   label: '设施B(预测目标)', color: '#8b5cf6' },
    ]

    let t = 0

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // 背景
      ctx.fillStyle = '#040810'
      ctx.fillRect(0, 0, W, H)

      // 网格
      ctx.strokeStyle = '#0d1a2e'
      ctx.lineWidth = 0.5
      for (let lng = -180; lng <= 180; lng += 20) {
        const [x] = toXY(0, lng)
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let lat = -90; lat <= 90; lat += 20) {
        const [, y] = toXY(lat, 0)
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // 关注区域高亮
      ctx.fillStyle = '#f59e0b06'
      const [rx, ry] = toXY(38, 38)
      const [rx2, ry2] = toXY(32, 50)
      ctx.fillRect(rx, ry, rx2 - rx, ry2 - ry)
      ctx.strokeStyle = '#f59e0b22'
      ctx.lineWidth = 1
      ctx.strokeRect(rx, ry, rx2 - rx, ry2 - ry)

      // 标注区域标签
      ctx.font = '8px JetBrains Mono'
      ctx.fillStyle = '#f59e0b44'
      ctx.fillText('监控区域', rx + 4, ry + 12)

      // 基地点
      SITES_POS.forEach(site => {
        const [x, y] = toXY(site.lat, site.lng)
        // 脉冲环
        const pulse = (Math.sin(t * 0.05 + site.lat) + 1) / 2
        ctx.beginPath()
        ctx.arc(x, y, 6 + pulse * 8, 0, Math.PI * 2)
        ctx.strokeStyle = site.color + '44'
        ctx.lineWidth = 1
        ctx.stroke()
        // 点
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = site.color
        ctx.fill()
        // 标签
        ctx.font = '9px JetBrains Mono'
        ctx.fillStyle = site.color
        ctx.fillText(site.label, x + 8, y - 4)
      })

      // ── Phase 1：飞机轨迹（过去）
      if (phaseRef.current >= 1) {
        const [sx, sy] = toXY(36.679, 42.447)
        const [tx, ty] = toXY(35.5, 45.1)
        const progress = Math.min(1, (t - 0) / 80)

        // 轨迹线
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + (tx - sx) * progress, sy + (ty - sy) * progress)
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.stroke()
        ctx.setLineDash([])

        // 飞机图标（三角）
        const px = sx + (tx - sx) * progress
        const py = sy + (ty - sy) * progress
        const angle = Math.atan2(ty - sy, tx - sx)
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.moveTo(7, 0); ctx.lineTo(-5, -4); ctx.lineTo(-3, 0); ctx.lineTo(-5, 4)
        ctx.closePath()
        ctx.fillStyle = '#f59e0b'
        ctx.fill()
        ctx.restore()
      }

      // ── Phase 2：打击事件高亮
      if (phaseRef.current >= 2) {
        const [x, y] = toXY(35.5, 45.1)
        const blast = (Math.sin(t * 0.15) + 1) / 2
        ctx.beginPath()
        ctx.arc(x, y, 8 + blast * 12, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(239,68,68,${0.15 + blast * 0.2})`
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#ef4444'
        ctx.fill()
        ctx.font = 'bold 9px JetBrains Mono'
        ctx.fillStyle = '#ef4444'
        ctx.fillText('✕ 受打击确认', x + 8, y + 16)
      }

      // ── Phase 3：预测轨迹
      if (phaseRef.current >= 3) {
        const [sx, sy] = toXY(36.679, 42.447)
        const [tx, ty] = toXY(34.8, 46.2)
        const progress = (Math.sin(t * 0.03) + 1) / 2

        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + (tx - sx) * progress, sy + (ty - sy) * progress)
        ctx.strokeStyle = '#8b5cf6'
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 4])
        ctx.stroke()
        ctx.setLineDash([])

        ctx.font = '10px JetBrains Mono'
        ctx.fillStyle = '#8b5cf6'
        ctx.fillText('预测打击路线', sx + (tx - sx) * 0.4, sy + (ty - sy) * 0.4 - 10)

        // 目标预测圆
        const [x, y] = toXY(34.8, 46.2)
        ctx.beginPath()
        ctx.arc(x, y, 10, 0, Math.PI * 2)
        ctx.strokeStyle = '#8b5cf6'
        ctx.setLineDash([3, 3])
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
      }

      t++
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return <canvas ref={canvasRef} width={700} height={380} style={{ width: '100%', borderRadius: '4px' }} />
}

// ── 主组件 ───────────────────────────────────────────────────
export default function Report() {
  const [phase, setPhase] = useState(0)
  const [showReport, setShowReport] = useState(false)
  const [playing, setPlaying] = useState(false)
  const phaseRef = useRef(0)

  function startPlayback() {
    setPlaying(true)
    setPhase(0)
    setShowReport(false)
    phaseRef.current = 0

    setTimeout(() => { setPhase(1) }, 800)
    setTimeout(() => { setPhase(2) }, 3000)
    setTimeout(() => { setPhase(3); setShowReport(true) }, 5500)
  }

  const phaseLabels = [
    { id: 0, label: '待机', desc: '等待演示启动' },
    { id: 1, label: '飞机出击', desc: 'F-16×4 06:12离场' },
    { id: 2, label: '打击确认', desc: '卫星验证目标受损' },
    { id: 3, label: '预测输出', desc: '明日05:30预测打击' },
  ]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* 左侧：地球演示 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
        {/* 标题 */}
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.05em' }}>
              {REPORT.title}
            </div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{REPORT.subtitle}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              padding: '4px 10px', borderRadius: '3px',
              background: '#22c55e22', border: '1px solid #22c55e',
              fontSize: '10px', color: '#22c55e',
            }}>
              整体置信度 {(REPORT.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* 阶段指示器 */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {phaseLabels.map((p) => (
            <div key={p.id} style={{
              flex: 1, padding: '8px',
              borderRadius: '3px',
              background: phase === p.id ? '#f59e0b22' : (phase > p.id ? '#22c55e11' : '#080f1e'),
              border: `1px solid ${phase === p.id ? '#f59e0b' : (phase > p.id ? '#22c55e44' : '#1a2d45')}`,
              transition: 'all 0.3s',
            }}>
              <div style={{ fontSize: '9px', color: phase >= p.id ? (phase === p.id ? '#f59e0b' : '#22c55e') : '#334155', fontWeight: 700 }}>
                {p.id + 1}. {p.label}
              </div>
              <div style={{ fontSize: '8px', color: '#64748b', marginTop: '2px' }}>{p.desc}</div>
            </div>
          ))}
        </div>

        {/* 地球/地图演示 */}
        <div style={{
          flex: 1, borderRadius: '4px', overflow: 'hidden',
          border: '1px solid #1a2d45', position: 'relative', minHeight: 0,
        }}>
          <GlobeDemo phase={phase} />
          {/* 叠加层标签 */}
          {phase >= 1 && (
            <div style={{
              position: 'absolute', top: '10px', left: '10px',
              fontSize: '10px', color: '#f59e0b',
              background: 'rgba(4,8,16,0.85)', padding: '4px 8px', borderRadius: '3px',
            }}>
              {phase === 1 && '◉ 飞机轨迹追踪中'}
              {phase === 2 && '✕ 打击已确认 · 卫星验证'}
              {phase >= 3 && '◈ 预测模式 · 明日行动路线'}
            </div>
          )}
        </div>

        {/* 控制按钮 */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={startPlayback}
            style={{
              flex: 1, padding: '10px',
              background: playing && phase > 0 ? '#0d1a2e' : '#f59e0b22',
              border: `1px solid ${playing && phase > 0 ? '#1a2d45' : '#f59e0b'}`,
              color: playing && phase > 0 ? '#64748b' : '#f59e0b',
              borderRadius: '3px', cursor: 'pointer',
              fontSize: '11px', letterSpacing: '0.08em',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ▶ {playing && phase > 0 ? '重新播放演示' : '启动演示'}
          </button>
          {phase >= 3 && (
            <button
              style={{
                flex: 1, padding: '10px',
                background: '#22c55e22', border: '1px solid #22c55e',
                color: '#22c55e', borderRadius: '3px', cursor: 'pointer',
                fontSize: '11px', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)',
              }}
            >
              ↻ 验证结果反哺 Agent
            </button>
          )}
        </div>
      </div>

      {/* 右侧：报告 */}
      <div style={{
        width: '360px', flexShrink: 0,
        background: '#040810', borderLeft: '1px solid #1a2d45',
        overflowY: 'auto', padding: '16px',
      }}>
        <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '12px' }}>
          AUTO REPORT · 自动生成报告
        </div>
        <div style={{ fontSize: '9px', color: '#334155', marginBottom: '16px' }}>{REPORT.generatedAt}</div>

        {/* 信源列表 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '8px' }}>支撑信源</div>
          {REPORT.sources.map((s, i) => (
            <div key={i} style={{
              padding: '8px 10px', marginBottom: '4px',
              background: '#080f1e', borderRadius: '3px',
              border: `1px solid ${s.verified ? '#1e3a5f' : '#1a2d45'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: s.verified ? '#e2e8f0' : '#64748b' }}>{s.label}</span>
                <span style={{ fontSize: '10px', color: confColor(s.confidence), fontWeight: 700 }}>
                  {(s.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ height: '3px', background: '#0d1a2e', borderRadius: '2px' }}>
                <div style={{ width: `${s.confidence * 100}%`, height: '100%', background: confColor(s.confidence), borderRadius: '2px' }} />
              </div>
              {s.verified && <div style={{ fontSize: '9px', color: '#22c55e', marginTop: '3px' }}>✓ 卫星验证</div>}
            </div>
          ))}
        </div>

        {/* 报告正文 */}
        <div style={{
          background: '#080f1e', border: '1px solid #1a2d45',
          borderRadius: '4px', padding: '14px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.1em', marginBottom: '10px' }}>分析摘要</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {showReport
              ? <StreamText text={REPORT.summary} speed={12} />
              : <span style={{ color: '#334155' }}>等待演示启动后自动生成报告...</span>
            }
          </div>
        </div>

        {/* 预测提报 */}
        {phase >= 3 && (
          <div style={{
            background: '#8b5cf611', border: '1px solid #8b5cf6',
            borderRadius: '4px', padding: '14px',
          }}>
            <div style={{ fontSize: '9px', color: '#8b5cf6', letterSpacing: '0.1em', marginBottom: '10px' }}>
              AUTO-ALERT · 自动预测提报
            </div>
            {REPORT.predictions.map((p, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 700 }}>{p.time}</div>
                <div style={{ fontSize: '11px', color: '#e2e8f0', margin: '2px 0' }}>{p.label}</div>
                <div style={{ fontSize: '10px', color: confColor(p.confidence) }}>
                  置信度 {(p.confidence * 100).toFixed(0)}%
                </div>
              </div>
            ))}
            <div style={{ marginTop: '10px', padding: '8px', background: '#040810', borderRadius: '3px', fontSize: '10px', color: '#64748b' }}>
              系统将在预测时间前2小时自动触发卫星拍摄任务，验证结果将实时更新本报告。
            </div>
          </div>
        )}

        <style>{`
          @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        `}</style>
      </div>
    </div>
  )
}
