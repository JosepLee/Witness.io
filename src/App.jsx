import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import EventChain from './pages/EventChain'
import SitePackage from './pages/SitePackage'
import Report from './pages/Report'
import WorldSim from './pages/WorldSim'

const NAV_ITEMS = [
  { path: '/',          label: '态势分析', sub: 'SITUATION MAP',  icon: '◎' },
  { path: '/chain',     label: '信实链',   sub: 'EVENT CHAIN',    icon: '⬡' },
  { path: '/simulate',  label: '世界模拟', sub: 'WORLD SIM',      icon: '◈' },
  { path: '/report',    label: '智能预测', sub: 'INTEL REPORT',   icon: '▣' },
]

function Nav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      height: '52px',
      background: 'rgba(4,8,16,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #1a2d45',
      display: 'flex', alignItems: 'center',
      padding: '0 24px',
      gap: '0',
    }}>
      {/* Logo */}
      <div style={{ marginRight: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '28px', height: '28px',
          border: '1.5px solid #f59e0b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', color: '#f59e0b',
          fontFamily: 'var(--font-display)',
        }}>S</div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '14px', letterSpacing: '0.15em', color: '#e2e8f0' }}>
          SATINT
        </span>
        <span style={{ fontSize: '10px', color: '#334155', marginLeft: '4px', letterSpacing: '0.1em' }}>v0.1 DEMO</span>
        <span style={{
          fontSize: '9px', color: '#1e3a5f', marginLeft: '8px',
          letterSpacing: '0.08em', borderLeft: '1px solid #1a2d45', paddingLeft: '8px',
        }}>
          卫星影像 → 信实验证 → 智能预测
        </span>
      </div>

      {/* Nav links */}
      {NAV_ITEMS.map(item => (
        <NavLink key={item.path} to={item.path} end={item.path === '/'}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '0 20px', height: '52px',
            textDecoration: 'none',
            borderBottom: isActive ? '2px solid #f59e0b' : '2px solid transparent',
            color: isActive ? '#f59e0b' : '#64748b',
            transition: 'all 0.15s',
            fontSize: '11px',
            letterSpacing: '0.08em',
          })}
        >
          <span style={{ fontSize: '14px', opacity: 0.8 }}>{item.icon}</span>
          <div>
            <div style={{ fontWeight: 500 }}>{item.label}</div>
            <div style={{ fontSize: '9px', opacity: 0.5, letterSpacing: '0.12em' }}>{item.sub}</div>
          </div>
        </NavLink>
      ))}

      {/* Status indicator */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#334155' }}>
        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
        LIVE · 2025-11-03 14:30 UTC
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <div style={{ paddingTop: '52px', height: '100vh', overflow: 'hidden' }}>
        <Routes>
          <Route path="/"            element={<SitePackage />} />
          <Route path="/site/:siteId" element={<SitePackage />} />
          <Route path="/chain"       element={<EventChain />} />
          <Route path="/simulate"    element={<WorldSim />} />
          <Route path="/report"      element={<Report />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
