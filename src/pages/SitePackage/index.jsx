import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { EVENTS } from "../../data/mockData";

// ── 颜色工具 ─────────────────────────────────────────────────
const STATUS_COLOR = { operational: "#22c55e", damaged: "#f59e0b", destroyed: "#ef4444" };
const STATUS_LABEL = { operational: "运行中", damaged: "受损", destroyed: "被摧毁" };
const TYPE_COLOR   = { military: "#ef4444", verified: "#22c55e", news: "#f59e0b", infrastructure: "#0ea5e9" };
const TYPE_LABEL   = { military: "军事动态", verified: "已验证", news: "新闻报道", infrastructure: "基础设施" };

const statusColor = (s) => STATUS_COLOR[s] ?? "#ef4444";
const statusLabel = (s) => STATUS_LABEL[s] ?? "被摧毁";
const scoreColor  = (v) => v >= 80 ? "#22c55e" : v >= 60 ? "#f59e0b" : v >= 40 ? "#f97316" : "#ef4444";
const confColor   = (v) => v >= 0.7 ? "#22c55e" : v >= 0.45 ? "#f59e0b" : "#ef4444";

// hex → { r, g, b } (0-1 范围)
const hexToRgb01 = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16) / 255,
  g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255,
});

// ── 瓦片地址 ─────────────────────────────────────────────────
const TIANDITU_TOKEN = "2bac672b2cdbc6986edde89f55058e28";
const getTiandituUrl = () =>
  `/tianditu-proxy/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_TOKEN}`;
const getBaseMapUrl = () =>
  window.__USE_BASEMAP_PROXY__
    ? "/worldmap/getdata?x={x}&y={y}&l={z}"
    : `http://${window.BASE_MAP_ADDRESS ?? import.meta.env?.VITE_BASE_MAP_ADDRESS ?? "124.70.78.85"}:${window.BASE_MAP_PORT ?? import.meta.env?.VITE_BASE_MAP_PORT ?? "9998"}/getdata?x={x}&y={y}&l={z}`;
const COMBAT_MAP_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const SAT_MK   = "15a2cd5b39d410616803f21d639ab9d0";
const SAT_TK   = "82a2673880cdfd3e75a63f2b5ad42ff4";
const SAT_HOST = typeof __SAT_HOST__ !== "undefined" ? __SAT_HOST__ : "1.94.249.221";
const SAT_PORT = typeof __SAT_PORT__ !== "undefined" ? __SAT_PORT__ : "8095";
const SAT_BASE = `http://${SAT_HOST}:${SAT_PORT}`;

const getSatUrl = (numericId, timeStr) => {
  const t = encodeURIComponent(timeStr);
  return `${SAT_BASE}/targetpointmap/getImage/{z}/{x}/{y}?mk=${SAT_MK}&tk=${SAT_TK}&pointId=${numericId}&time=${t}&size=256`;
};

const warnedCoords = new Set();
const normCoord = (item) => {
  const lng = Number(item?.lng ?? item?.lon ?? item?.longitude);
  const lat = Number(item?.lat ?? item?.latitude);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    const k = String(item?.id ?? "?");
    if (!warnedCoords.has(k)) { console.warn("[overlay] 无效坐标:", item); warnedCoords.add(k); }
    return null;
  }
  return { lng, lat };
};

// ── 武器配置 ─────────────────────────────────────────────────
const WEAPON_TYPE_LABEL = { srm: "近程", mrm: "中程", lrm: "远程", icbm: "洲际", air: "防空", navy: "海军" };

function deriveWeapons(site) {
  if (site?.weapons?.length) return site.weapons;
  const aci = site?.aci ?? 50;
  const list = [];
  if (aci >= 20) list.push({ id: "def_srm",  name: "近程导弹",     type: "srm",  rangeKm: 60,   color: "#22c55e" });
  if (aci >= 40) list.push({ id: "def_mrm",  name: "中程弹道导弹", type: "mrm",  rangeKm: 200,  color: "#f59e0b" });
  if (aci >= 60) list.push({ id: "def_lrm",  name: "远程巡航导弹", type: "lrm",  rangeKm: 450,  color: "#ef4444" });
  if (aci >= 80) list.push({ id: "def_icbm", name: "洲际弹道导弹", type: "icbm", rangeKm: 1200, color: "#a855f7" });
  return list;
}

// ══════════════════════════════════════════════════════════════
//  useRadiusEntities
//  用 Cesium Entity（EllipseGraphics）在地球表面绘制真实地理半径圆
//  ★ 关键修复：material 必须是 ColorMaterialProperty，不能直接传 Color
// ══════════════════════════════════════════════════════════════
function useRadiusEntities(viewerRef, cesiumRef, sites, perSiteWeapon, allWeaponsBySite) {
  const entityMapRef = useRef({});
  const rafRef       = useRef(null);
  const timeRef      = useRef(0);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium) return;

    const {
      Cartesian3,
      Color,
      ColorMaterialProperty, // ★ 必须用这个包装 material
      CallbackProperty,
      HeightReference,
    } = Cesium;

    const clearSite = (siteId) => {
      (entityMapRef.current[siteId] ?? []).forEach((id) => {
        const e = viewer.entities.getById(id);
        if (e) viewer.entities.remove(e);
      });
      entityMapRef.current[siteId] = [];
    };

    // 先清除所有不再激活的点位
    Object.keys(entityMapRef.current).forEach((siteId) => {
      const weaponId = perSiteWeapon[siteId];
      if (!weaponId) clearSite(siteId);
    });

    sites.forEach((site) => {
      const coord    = normCoord(site);
      if (!coord) return;

      const weaponId = perSiteWeapon[site.id];
      const weapons  = allWeaponsBySite[site.id] ?? [];
      const weapon   = weapons.find((w) => w.id === weaponId);

      // 清除旧 entity（武器切换或关闭时重建）
      clearSite(site.id);
      if (!weapon) return;

      const { r, g, b } = hexToRgb01(weapon.color ?? "#22c55e");
      const pos      = Cartesian3.fromDegrees(coord.lng, coord.lat, 0);
      const radiusM  = weapon.rangeKm * 1000;
      const ids      = [];

      // ① 填充圆 —— ★ new ColorMaterialProperty(color)
      const fillColor = new Color(r, g, b, 0.07);
      viewer.entities.add({
        id: `radius_fill_${site.id}`,
        position: pos,
        ellipse: {
          semiMajorAxis: radiusM,
          semiMinorAxis: radiusM,
          material: new ColorMaterialProperty(fillColor), // ★
          outline: false,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      });
      ids.push(`radius_fill_${site.id}`);

      // ② 边界轮廓线 —— outline 用 outlineColor（Color 实例，不需要 MaterialProperty）
      viewer.entities.add({
        id: `radius_outline_${site.id}`,
        position: pos,
        ellipse: {
          semiMajorAxis: radiusM,
          semiMinorAxis: radiusM,
          material: new ColorMaterialProperty(new Color(r, g, b, 0)), // ★ 透明填充
          outline: true,
          outlineColor: new Color(r, g, b, 0.85),                     // outlineColor 直接是 Color
          outlineWidth: 2,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      });
      ids.push(`radius_outline_${site.id}`);

      // ③ 波纹扩散圆（3个，相位错开）
      //    ★ CallbackProperty 返回 Color，外层用 ColorMaterialProperty 包装
      for (let wi = 0; wi < 3; wi++) {
        const phaseOffset = wi / 3;
        const waveId      = `radius_wave_${site.id}_${wi}`;

        // 动态半径
        const waveRadiusProp = new CallbackProperty(() => {
          const phase = (timeRef.current / 2400 + phaseOffset) % 1;
          return radiusM * (0.25 + phase * 0.78);
        }, false);

        // 动态颜色（返回 Color 实例）
        const waveColorCbProp = new CallbackProperty(() => {
          const phase   = (timeRef.current / 2400 + phaseOffset) % 1;
          const flicker = 1 + 0.3 * Math.sin(phase * Math.PI);
          const alpha   = (1 - phase) * 0.6 * flicker;
          return new Color(r, g, b, Math.min(alpha, 0.8));
        }, false);

        viewer.entities.add({
          id: waveId,
          position: pos,
          ellipse: {
            semiMajorAxis: waveRadiusProp,
            semiMinorAxis: waveRadiusProp,
            material: new ColorMaterialProperty(waveColorCbProp), // ★ 包装 CallbackProperty
            outline: false,
            heightReference: HeightReference.CLAMP_TO_GROUND,
          },
        });
        ids.push(waveId);
      }

      entityMapRef.current[site.id] = ids;
    });

    // 动画循环推进 timeRef
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const animate = (ts) => {
      timeRef.current = ts;
      rafRef.current  = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perSiteWeapon]);

  // 卸载时清理所有 entity
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const viewer = viewerRef.current;
      if (!viewer) return;
      Object.values(entityMapRef.current).flat().forEach((id) => {
        const e = viewer.entities.getById(id);
        if (e) viewer.entities.remove(e);
      });
      entityMapRef.current = {};
    };
  }, [viewerRef]);
}

// ══════════════════════════════════════════════════════════════
//  SitePopup  —  点击点位弹出浮窗，选择/关闭打击半径
// ══════════════════════════════════════════════════════════════
function SitePopup({ site, x, y, weapons, activeWeaponId, onSelect, onClose }) {
  if (!site) return null;
  const sc = statusColor(site.status);
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute", left: x, top: y,
        transform: "translate(-50%, calc(-100% - 16px))",
        width: 220,
        background: "#040c18", border: "1px solid #1a2d45", borderRadius: 6,
        boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(14,165,233,0.08)",
        zIndex: 800, pointerEvents: "auto",
        animation: "popupIn 0.15s ease",
      }}
    >
      {/* 指示箭头 */}
      <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 10, height: 6, overflow: "hidden" }}>
        <div style={{ width: 10, height: 10, background: "#1a2d45", transform: "rotate(45deg)", transformOrigin: "0 0", marginTop: -5 }} />
      </div>

      {/* 头部 */}
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #0d1a2e" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc, boxShadow: `0 0 5px ${sc}`, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>{site.name}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: 8, color: "#334155", marginTop: 4, fontFamily: "JetBrains Mono" }}>
          {site.lat?.toFixed(3)}°N &nbsp; {site.lng?.toFixed(3)}°E
        </div>
      </div>

      {/* 武器列表 */}
      <div style={{ padding: "8px 12px 10px" }}>
        <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.1em", marginBottom: 7 }}>打击半径 · 单选</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {weapons.map((w) => {
            const active = activeWeaponId === w.id;
            const hex = w.color ?? "#22c55e";
            return (
              <button key={w.id} onClick={() => onSelect(site.id, active ? null : w.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: active ? `${hex}15` : "transparent", border: `1px solid ${active ? hex + "66" : "#1a2d45"}`, borderRadius: 3, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: active ? hex : "transparent", border: `1.5px solid ${active ? hex : "#334155"}`, boxShadow: active ? `0 0 6px ${hex}` : "none", transition: "all 0.15s" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? "#e2e8f0" : "#64748b" }}>{w.name}</div>
                  <div style={{ fontSize: 8, color: active ? `${hex}aa` : "#1e3a5f", fontFamily: "JetBrains Mono", marginTop: 1 }}>
                    {WEAPON_TYPE_LABEL[w.type] ?? w.type} · {w.rangeKm} km
                  </div>
                </div>
                {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: hex, boxShadow: `0 0 6px ${hex}`, flexShrink: 0, animation: "wDot 1.4s ease-in-out infinite" }} />}
              </button>
            );
          })}
        </div>
        {activeWeaponId && (
          <button onClick={() => onSelect(site.id, null)}
            style={{ marginTop: 6, width: "100%", padding: "4px 0", fontSize: 8, color: "#334155", background: "transparent", border: "1px solid #1a2d45", borderRadius: 3, cursor: "pointer", letterSpacing: "0.06em", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
          >关闭半径显示</button>
        )}
      </div>

      <style>{`
        @keyframes popupIn { from{opacity:0;transform:translate(-50%,calc(-100% - 8px))} to{opacity:1;transform:translate(-50%,calc(-100% - 16px))} }
        @keyframes wDot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.8)} }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  LayerPanel
// ══════════════════════════════════════════════════════════════
function LayerPanel({ layers, onLayersChange }) {
  const basemapOptions = [
    { id: "combat", label: "作战绘制图层",           desc: "CartoDB 暗色矢量底图",  icon: "🗺" },
    { id: "own",    label: '"吉林一号" 星座全球底图', desc: "卫星影像 + 天地图路网",  icon: "🛰" },
  ];
  const overlayItems = [
    { id: "sites",     label: "基地点位标记",   desc: "ACI 指数 · 状态监控",   icon: "◎", color: "#22c55e" },
    { id: "news",      label: "新闻事件标记",   desc: "多源新闻 · 实时更新",   icon: "📰", color: "#f59e0b" },
    { id: "osint",     label: "OSINT 情报标记", desc: "开源情报 · 置信度标注", icon: "◈", color: "#0ea5e9" },
    { id: "satellite", label: "点位包影像",     desc: "点位影像 · 时间轴联动", icon: "🛸", color: "#8b5cf6" },
  ];
  const GroupHeader = ({ icon, label, count }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px 5px", borderBottom: "1px solid #0d1a2e" }}>
      <span style={{ fontSize: 10, color: "#334155" }}>{icon}</span>
      <span style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.12em", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 8, color: "#1e3a5f", marginLeft: "auto" }}>{count}</span>
    </div>
  );
  const RadioRow = ({ option, active, onClick }) => (
    <button onClick={onClick}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: active ? "rgba(14,165,233,0.08)" : "transparent", border: "none", borderBottom: "1px solid #0a1520", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${active ? "#0ea5e9" : "#334155"}`, background: active ? "#0ea5e9" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        {active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#040810" }} />}
      </div>
      <span style={{ fontSize: 12, lineHeight: 1, flexShrink: 0 }}>{option.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: active ? "#e2e8f0" : "#94a3b8", fontWeight: active ? 600 : 400 }}>{option.label}</div>
        <div style={{ fontSize: 8, color: "#334155", marginTop: 2 }}>{option.desc}</div>
      </div>
      {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#0ea5e9", boxShadow: "0 0 6px #0ea5e9", flexShrink: 0 }} />}
    </button>
  );
  const CheckRow = ({ item, checked, onToggle }) => (
    <button onClick={onToggle}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: checked ? `${item.color}08` : "transparent", border: "none", borderBottom: "1px solid #0a1520", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}
      onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { if (!checked) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ width: 14, height: 14, borderRadius: 2, border: `1.5px solid ${checked ? item.color : "#334155"}`, background: checked ? item.color : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><polyline points="1,3.5 3.5,6 8,1" stroke="#040810" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span style={{ fontSize: 12, lineHeight: 1, flexShrink: 0, color: checked ? item.color : "#334155" }}>{item.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: checked ? "#e2e8f0" : "#64748b", fontWeight: checked ? 500 : 400 }}>{item.label}</div>
        <div style={{ fontSize: 8, color: "#334155", marginTop: 2 }}>{item.desc}</div>
      </div>
      <div style={{ flexShrink: 0, opacity: checked ? 0.8 : 0.25, fontSize: 10, color: checked ? item.color : "#64748b" }}>{checked ? "👁" : "🚫"}</div>
    </button>
  );
  return (
    <div style={{ width: 230, background: "#040c18", border: "1px solid #1a2d45", borderRadius: 6, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(14,165,233,0.08)", animation: "layerPanelIn 0.18s ease" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #1a2d45", display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="0" y="0" width="12" height="3"   rx="1" fill="#0ea5e9" opacity="0.9" />
          <rect x="0" y="4.5" width="12" height="3" rx="1" fill="#0ea5e9" opacity="0.6" />
          <rect x="0" y="9"   width="8"  height="3" rx="1" fill="#0ea5e9" opacity="0.3" />
        </svg>
        <span style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.14em", fontWeight: 600 }}>图层管理</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" }} />
          <span style={{ fontSize: 8, color: "#22c55e" }}>活动中</span>
        </div>
      </div>
      <GroupHeader icon="⬛" label="底图图层" count={`${basemapOptions.length} 项 · 单选`} />
      {basemapOptions.map((opt) => <RadioRow key={opt.id} option={opt} active={layers.basemap === opt.id} onClick={() => onLayersChange({ ...layers, basemap: opt.id })} />)}
      <GroupHeader icon="📍" label="标注图层" count={`${overlayItems.length} 项 · 多选`} />
      {overlayItems.map((item) => <CheckRow key={item.id} item={item} checked={layers[item.id]} onToggle={() => onLayersChange({ ...layers, [item.id]: !layers[item.id] })} />)}
      <div style={{ padding: "7px 14px", borderTop: "1px solid #0d1a2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 8, color: "#1e3a5f", letterSpacing: "0.08em" }}>{overlayItems.filter((i) => layers[i.id]).length}/{overlayItems.length} 标注可见</span>
        <button onClick={() => onLayersChange({ basemap: "combat", sites: true, news: true, osint: true, satellite: true })}
          style={{ fontSize: 8, color: "#334155", background: "transparent", border: "none", cursor: "pointer", letterSpacing: "0.06em", padding: "2px 4px" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
        >重置</button>
      </div>
      <style>{`@keyframes layerPanelIn { from{opacity:0;transform:translateY(8px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }`}</style>
    </div>
  );
}

function LayerToggleButton({ open, onClick, layers }) {
  const activeOverlays = ["sites", "news", "osint", "satellite"].filter((k) => layers[k]).length;
  return (
    <button onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", background: open ? "rgba(14,165,233,0.15)" : "rgba(4,8,16,0.88)", border: `1px solid ${open ? "#0ea5e9" : "#1a2d45"}`, borderRadius: 4, cursor: "pointer", backdropFilter: "blur(8px)", transition: "all 0.2s", boxShadow: open ? "0 0 16px rgba(14,165,233,0.2)" : "none" }}
      onMouseEnter={(e) => { if (!open) { e.currentTarget.style.borderColor = "#0ea5e966"; e.currentTarget.style.background = "rgba(14,165,233,0.06)"; } }}
      onMouseLeave={(e) => { if (!open) { e.currentTarget.style.borderColor = "#1a2d45"; e.currentTarget.style.background = "rgba(4,8,16,0.88)"; } }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1"   width="12" height="3.5" rx="1" fill={open ? "#0ea5e9" : "#64748b"} opacity="1"    />
        <rect x="1" y="5.3" width="12" height="3.5" rx="1" fill={open ? "#0ea5e9" : "#64748b"} opacity="0.65" />
        <rect x="1" y="9.5" width="8"  height="3.5" rx="1" fill={open ? "#0ea5e9" : "#64748b"} opacity="0.35" />
      </svg>
      <span style={{ fontSize: 10, color: open ? "#0ea5e9" : "#94a3b8", letterSpacing: "0.06em", fontFamily: "JetBrains Mono" }}>图层</span>
      <div style={{ minWidth: 16, height: 16, borderRadius: 8, background: open ? "#0ea5e9" : "#1a2d45", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: open ? "#040810" : "#64748b", fontWeight: 700, fontFamily: "JetBrains Mono", padding: "0 4px", transition: "all 0.2s" }}>
        {activeOverlays + 1}
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
//  TheaterSwitcher
// ══════════════════════════════════════════════════════════════
function TheaterSwitcher({ currentId, onChange, theaters = [] }) {
  const [open, setOpen] = useState(false);
  const current = theaters.find((t) => t.id === currentId) ?? theaters[0] ?? {};
  return (
    <div style={{ padding: "10px 14px", borderBottom: "1px solid #1a2d45", position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: open ? "#0d1a2e" : "rgba(14,165,233,0.06)", border: `1px solid ${open ? "#0ea5e9" : "#1a2d45"}`, borderRadius: 4, cursor: "pointer", transition: "all 0.2s", outline: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ position: "relative", width: 8, height: 8 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#0ea5e9", animation: "theaterPulse 2s ease-out infinite" }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#0ea5e9" }} />
          </div>
          <span style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.12em", fontFamily: "JetBrains Mono" }}>专题分类</span>
          <span style={{ fontSize: 10, color: "#e2e8f0", fontWeight: 600 }}>{current.flag} {current.label}</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
          <polyline points="2,4 6,8 10,4" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% - 2px)", left: 14, right: 14, zIndex: 2000, background: "#040810", border: "1px solid #0ea5e944", borderRadius: 4, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", animation: "dropDown 0.18s ease" }}>
          {theaters.map((theater, idx) => {
            const isActive = theater.id === currentId;
            return (
              <button key={theater.id} onClick={() => { onChange(theater.id); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: isActive ? "rgba(14,165,233,0.12)" : "transparent", border: "none", borderTop: idx > 0 ? "1px solid #0d1a2e" : "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(14,165,233,0.06)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{theater.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: isActive ? "#0ea5e9" : "#cbd5e1", fontWeight: isActive ? 700 : 400 }}>{theater.label}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 8, color: "#334155" }}>{theater.siteCount ?? "—"} 点位</div>
                  {isActive && (
                    <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end", marginTop: 2 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#22c55e" }} />
                      <span style={{ fontSize: 7, color: "#22c55e" }}>ACTIVE</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
          <div style={{ padding: "6px 12px", borderTop: "1px solid #0d1a2e", fontSize: 8, color: "#1e3a5f", letterSpacing: "0.08em" }}>◈ {theaters.length} 专题已载入</div>
        </div>
      )}
      <style>{`
        @keyframes theaterPulse { 0%{transform:scale(1);opacity:.9} 60%{transform:scale(2.2);opacity:0} 100%{transform:scale(2.2);opacity:0} }
        @keyframes dropDown     { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  BaseList
// ══════════════════════════════════════════════════════════════
function BaseList({ sites, selectedId, onSelect, theaterId, onTheaterChange, theaters = [] }) {
  const [filter, setFilter] = useState("all");
  const FILTERS = [["all","全部"],["operational","运行中"],["damaged","受损"],["destroyed","被摧毁"]];
  const visible = filter === "all" ? sites : sites.filter((s) => s.status === filter);
  useEffect(() => { setFilter("all"); }, [theaterId]);
  const theater = theaters.find((t) => t.id === theaterId) ?? theaters[0] ?? {};
  return (
    <div style={{ width: 220, flexShrink: 0, background: "#040810", borderRight: "1px solid #1a2d45", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TheaterSwitcher currentId={theaterId} onChange={onTheaterChange} theaters={theaters} />
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #1a2d45" }}>
        <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em", marginBottom: 8 }}>监控点位</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FILTERS.map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={{ padding: "3px 8px", borderRadius: 2, cursor: "pointer", fontSize: 9, letterSpacing: "0.06em", background: filter===k ? "#f59e0b22" : "transparent", border: `1px solid ${filter===k ? "#f59e0b" : "#1a2d45"}`, color: filter===k ? "#f59e0b" : "#64748b" }}
            >{l}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {visible.map((site) => {
          const sc = statusColor(site.status), sel = site.id === selectedId;
          return (
            <div key={site.id} onClick={() => onSelect(site.id)}
              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #0d1a2e", borderLeft: `2px solid ${sel ? sc : "transparent"}`, background: sel ? `${sc}0d` : "transparent", transition: "all 0.15s" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: sc, boxShadow: `0 0 4px ${sc}`, flexShrink: 0 }} />
                <div style={{ fontSize: 11, color: sel ? "#e2e8f0" : "#94a3b8", fontWeight: sel ? 600 : 400, lineHeight: 1.3 }}>{site.name}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 15 }}>
                <span style={{ fontSize: 9, color: "#334155" }}>{site.country}</span>
                <span style={{ fontSize: 9, color: sc }}>{statusLabel(site.status)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "10px 14px", borderTop: "1px solid #1a2d45", fontSize: 9, color: "#1e3a5f", lineHeight: 1.6 }}>
        ◉ 卫星影像 → 事实基础层<br />
        点位数据锚定信实链节点<br />
        <span style={{ color: "#334155" }}>◈ {theater.osintEvents?.length ?? 0} 条开源情报待验证</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  NewsModal / OsintCard
// ══════════════════════════════════════════════════════════════
function NewsModal({ news, onClose }) {
  if (!news) return null;
  const tc = TYPE_COLOR[news.type] ?? "#94a3b8", tl = TYPE_LABEL[news.type] ?? "信息";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#040810", border: "1px solid #1a2d45", borderRadius: 6, padding: 24, maxWidth: 500, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ display: "inline-block", padding: "4px 10px", borderRadius: 3, background: `${tc}22`, border: `1px solid ${tc}44`, color: tc, fontSize: 9, fontWeight: 700, marginBottom: 8, letterSpacing: "0.08em" }}>{tl}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.4 }}>{news.title}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 9, color: "#64748b", borderBottom: "1px solid #0d1a2e", paddingBottom: 12 }}>
          <span>📅 {news.date}</span><span>📡 {news.source}</span>
        </div>
        <div style={{ fontSize: 11, color: "#c7d2e0", lineHeight: 1.6 }}>{news.content}</div>
        <div style={{ marginTop: 16, padding: 12, background: "#0d1a2e", borderRadius: 3, fontSize: 9, color: "#94a3b8" }}>
          📍 {news.lat.toFixed(2)}° N, {news.lng.toFixed(2)}° E
        </div>
      </div>
    </div>
  );
}

function OsintCard({ event, onClose }) {
  if (!event) return null;
  const c = confColor(event.confidence);
  const srcLabel = { social:"社交媒体", news:"新闻媒体", official:"官方声明", anonymous:"匿名信源" }[event.sourceType] ?? "OSINT";
  return (
    <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 320, zIndex: 1100, background: "#080f1e", border: `1px solid ${c}66`, borderRadius: 4, padding: 16, boxShadow: `0 0 24px ${c}22`, pointerEvents: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 2, background: "#f59e0b22", border: "1px solid #f59e0b44", color: "#f59e0b" }}>OSINT</span>
            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 2, background: "#1e3a5f", border: "1px solid #1a2d45", color: "#64748b" }}>链 {event.relatedChain}</span>
            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 2, background: "#0d1a2e", color: "#334155" }}>{srcLabel}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.3 }}>{event.title}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, flexShrink: 0, marginLeft: 8 }}>×</button>
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.6, marginBottom: 10 }}>{event.content}</div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: "#64748b" }}>LLM 综合置信度</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{(event.confidence * 100).toFixed(0)}%</span>
        </div>
        <div style={{ height: 3, background: "#0d1a2e", borderRadius: 2 }}>
          <div style={{ width: `${event.confidence * 100}%`, height: "100%", background: c, borderRadius: 2, transition: "width 0.4s" }} />
        </div>
      </div>
      <div style={{ padding: "8px 10px", background: "#0d1a2e", borderRadius: 3, fontSize: 9, color: "#64748b", lineHeight: 1.6, marginBottom: 10, borderLeft: `2px solid ${c}44` }}>
        <span style={{ color: "#334155" }}>AI 分析：</span>{event.llmAnalysis}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#334155" }}>
        <span>{event.source}</span><span>{event.date ?? event.time ?? "--"}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SiteMap
// ══════════════════════════════════════════════════════════════
function SiteMap({
  sites, selectedId, onSelect, osintEvents, newsMarkers,
  onOsintSelect, theaterCamera, layers, activeImgTime, activeNumericId,
  onReady, onSiteMarkerClick, perSiteWeapon, allWeaponsBySite,
}) {
  const sitesRef = useRef(sites);
  const newsRef  = useRef(newsMarkers);
  const osintRef = useRef(osintEvents);
  useEffect(() => { sitesRef.current = sites; }, [sites]);
  useEffect(() => { newsRef.current  = newsMarkers; }, [newsMarkers]);
  useEffect(() => { osintRef.current = osintEvents; }, [osintEvents]);

  const containerRef = useRef(null);
  const viewerRef    = useRef(null);
  const cesiumRef    = useRef(null);
  const handlerRef   = useRef(null);
  const layerRefsRef = useRef({ base: null, cia: null, combat: null, satellite: null });

  const [selectedNews, setSelectedNews] = useState(null);
  const [pts, setPts] = useState({ sites: [], news: [], osint: [] });
  const baseMapUrl = useMemo(getBaseMapUrl, []);

  // ★ 半径 entity 管理
  useRadiusEntities(viewerRef, cesiumRef, sites, perSiteWeapon, allWeaponsBySite);

  useEffect(() => {
    let destroyed = false;
    async function init() {
      if (!containerRef.current || viewerRef.current) return;
      const Cesium = await import("cesium");
      if (destroyed) return;
      cesiumRef.current = Cesium;
      const { Viewer, UrlTemplateImageryProvider, GeographicTilingScheme, WebMercatorTilingScheme, Ellipsoid, EllipsoidTerrainProvider, Color, Cartesian3, ScreenSpaceEventHandler, ScreenSpaceEventType, defined, Rectangle } = Cesium;

      const viewer = new Viewer(containerRef.current, {
        animation: false, timeline: false, baseLayerPicker: false,
        fullscreenButton: false, vrButton: false, geocoder: false,
        homeButton: false, sceneModePicker: false, navigationHelpButton: false,
        infoBox: false, selectionIndicator: false,
        navigationInstructionsInitiallyVisible: false,
        terrainProvider: new EllipsoidTerrainProvider(), shouldAnimate: true,
      });
      viewerRef.current = viewer;
      if (viewer.cesiumWidget.creditContainer) viewer.cesiumWidget.creditContainer.style.display = "none";

      viewer.imageryLayers.removeAll();
      const baseLayer = viewer.imageryLayers.addImageryProvider(new UrlTemplateImageryProvider({ url: baseMapUrl, tilingScheme: new GeographicTilingScheme({ ellipsoid: Ellipsoid.WGS84 }), minimumLevel: 0, maximumLevel: 18, enablePickFeatures: false }));
      baseLayer.show = false; layerRefsRef.current.base = baseLayer;

      const ciaLayer = viewer.imageryLayers.addImageryProvider(new UrlTemplateImageryProvider({ url: getTiandituUrl(), tilingScheme: new WebMercatorTilingScheme(), minimumLevel: 0, maximumLevel: 18, enablePickFeatures: false }));
      ciaLayer.show = false; layerRefsRef.current.cia = ciaLayer;

      const combatLayer = viewer.imageryLayers.addImageryProvider(new UrlTemplateImageryProvider({ url: COMBAT_MAP_URL, subdomains: ["a","b","c","d"], minimumLevel: 0, maximumLevel: 19, enablePickFeatures: false }));
      combatLayer.show = true; layerRefsRef.current.combat = combatLayer;
      layerRefsRef.current.satellite = null;

      viewer.__loadSatelliteLayer__ = async (numericId, timeStr, lat, lng) => {
        const lr = layerRefsRef.current;
        if (lr.satellite) { viewer.imageryLayers.remove(lr.satellite, true); lr.satellite = null; }
        if (!numericId || !timeStr || lat == null || lng == null) return;
        const delta = 0.06;
        const rectangle = Rectangle.fromDegrees(Math.max(lng-delta,-180), Math.max(lat-delta,-90), Math.min(lng+delta,180), Math.min(lat+delta,90));
        const satProvider = new UrlTemplateImageryProvider({ url: getSatUrl(numericId, timeStr), tilingScheme: new GeographicTilingScheme({ ellipsoid: Ellipsoid.WGS84 }), minimumLevel: 0, maximumLevel: 18, enablePickFeatures: false, rectangle });
        satProvider.errorEvent.addEventListener((e) => console.warn("[satellite] tile err:", e));
        const satLayer = viewer.imageryLayers.addImageryProvider(satProvider);
        satLayer.alpha = 1; lr.satellite = satLayer;
        viewer.camera.flyTo({ destination: Cartesian3.fromDegrees(lng, lat, 15000), duration: 1.5 });
      };

      Object.assign(viewer.scene, { fxaa: true });
      viewer.scene.skyBox.show = viewer.scene.moon.show = viewer.scene.sun.show = false;
      viewer.scene.backgroundColor = viewer.scene.globe.baseColor = Color.fromCssColorString("#040810");
      viewer.scene.globe.enableLighting = false;
      viewer.camera.flyTo({ destination: Cartesian3.fromDegrees(theaterCamera.lng, theaterCamera.lat, theaterCamera.alt), duration: 0 });

      const updateOverlays = () => {
        if (!viewerRef.current || !cesiumRef.current) return;
        const { Cartesian3: C3, SceneTransforms, EllipsoidalOccluder, defined: def } = cesiumRef.current;
        const occluder = new EllipsoidalOccluder(viewer.scene.globe.ellipsoid, viewer.camera.positionWC);
        const project = SceneTransforms.worldToWindowCoordinates ?? SceneTransforms.wgs84ToWindowCoordinates;
        const canvas = viewer.scene.canvas;
        const projectItem = (item) => {
          const coord = normCoord(item); if (!coord) return null;
          const cart = C3.fromDegrees(coord.lng, coord.lat, 0);
          if (!occluder.isPointVisible(cart)) return null;
          const wp = project(viewer.scene, cart); if (!def(wp)) return null;
          if (wp.x < -80 || wp.x > canvas.clientWidth+80 || wp.y < -80 || wp.y > canvas.clientHeight+80) return null;
          return { ...item, x: wp.x, y: wp.y };
        };
        setPts({ sites: sitesRef.current.map(projectItem).filter(Boolean), news: newsRef.current.map(projectItem).filter(Boolean), osint: osintRef.current.map(projectItem).filter(Boolean) });
      };
      viewer.__updateOverlays__ = updateOverlays;
      viewer.scene.postRender.addEventListener(updateOverlays);

      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((mv) => {
        if (!defined(viewer.scene.pick(mv.position))) { onOsintSelect(null); setSelectedNews(null); }
      }, ScreenSpaceEventType.LEFT_CLICK);
      handlerRef.current = handler;
      updateOverlays();
      onReady?.(viewerRef, cesiumRef);
    }
    init();
    return () => {
      destroyed = true;
      handlerRef.current?.destroy(); handlerRef.current = null;
      viewerRef.current?.destroy();  viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMapUrl]);

  useEffect(() => {
    if (!viewerRef.current || !cesiumRef.current) return;
    const { Cartesian3 } = cesiumRef.current;
    viewerRef.current.camera.flyTo({ destination: Cartesian3.fromDegrees(theaterCamera.lng, theaterCamera.lat, theaterCamera.alt), duration: 1.8 });
  }, [theaterCamera]);

  useEffect(() => {
    if (!viewerRef.current || !cesiumRef.current || !selectedId) return;
    const site = sitesRef.current.find((s) => s.id === selectedId);
    if (!site) return;
    const coord = normCoord(site); if (!coord) return;
    const { Cartesian3 } = cesiumRef.current;
    viewerRef.current.camera.flyTo({ destination: Cartesian3.fromDegrees(coord.lng, coord.lat, 900000), duration: 1.2 });
    viewerRef.current.__updateOverlays__?.();
  }, [selectedId]);

  useEffect(() => {
    const lr = layerRefsRef.current;
    if (!lr.base || !lr.cia || !lr.combat) return;
    const isOwn = layers.basemap === "own";
    lr.base.show = isOwn; lr.cia.show = isOwn; lr.combat.show = !isOwn;
  }, [layers.basemap]);

  useEffect(() => {
    if (!viewerRef.current?.__loadSatelliteLayer__) return;
    if (layers.satellite && activeNumericId && activeImgTime) {
      const currentSite = sitesRef.current.find((s) => s.id === selectedId);
      if (!currentSite?.lat || !currentSite?.lng) return;
      viewerRef.current.__loadSatelliteLayer__(activeNumericId, activeImgTime, currentSite.lat, currentSite.lng);
    } else {
      viewerRef.current.__loadSatelliteLayer__(null, null, null, null);
    }
  }, [selectedId, activeNumericId, activeImgTime, layers.satellite]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 600 }}>
        {layers.sites && pts.sites.map((site) => {
          const c = statusColor(site.status), sel = site.id === selectedId;
          const activeWeapon = (allWeaponsBySite[site.id] ?? []).find((w) => w.id === perSiteWeapon[site.id]);
          return (
            <div key={site.id} style={{ position: "absolute", left: site.x, top: site.y, transform: "translate(-50%,-50%)", pointerEvents: "auto", cursor: "pointer", zIndex: sel ? 30 : 20 }}>
              <div style={{ position: "absolute", left: "50%", top: "50%", width: sel ? 42 : 32, height: sel ? 42 : 32, transform: "translate(-50%,-50%)", borderRadius: "50%", border: `2px solid ${c}`, opacity: 0.5, animation: "sitePulse 1.8s ease-out infinite" }} />
              <div
                onClick={(e) => { e.stopPropagation(); onSelect(site.id); onOsintSelect(null); onSiteMarkerClick(site, site.x, site.y); }}
                style={{ width: sel ? 28 : 24, height: sel ? 28 : 24, borderRadius: "50%", background: `${c}33`, border: `2px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: c, fontFamily: "JetBrains Mono", fontWeight: 700, boxShadow: `0 0 ${sel ? 18 : 10}px ${c}${sel ? "aa" : "66"}`, backdropFilter: "blur(2px)", transition: "all 0.2s" }}
              >{site.aci}</div>
              {activeWeapon && (
                <div style={{ position: "absolute", left: "50%", top: "100%", transform: "translate(-50%, 4px)", whiteSpace: "nowrap", padding: "2px 6px", borderRadius: 2, background: "rgba(4,8,16,0.88)", border: `1px solid ${activeWeapon.color}55`, color: activeWeapon.color, fontSize: 8, fontFamily: "JetBrains Mono", pointerEvents: "none" }}>
                  {activeWeapon.rangeKm}km
                </div>
              )}
              {sel && (
                <div style={{ position: "absolute", left: "50%", top: -12, transform: "translate(-50%,-100%)", whiteSpace: "nowrap", padding: "5px 8px", borderRadius: 3, background: "rgba(4,8,16,0.92)", border: `1px solid ${c}66`, color: "#e2e8f0", fontSize: 10, boxShadow: `0 0 12px ${c}22`, pointerEvents: "none" }}>
                  {site.name}
                </div>
              )}
            </div>
          );
        })}
        {layers.news && pts.news.map((item) => {
          const tc = TYPE_COLOR[item.type] ?? "#94a3b8";
          return (
            <div key={item.id} onClick={(e) => { e.stopPropagation(); setSelectedNews(item); onOsintSelect(null); }}
              style={{ position: "absolute", left: item.x, top: item.y, transform: "translate(-50%,-50%)", pointerEvents: "auto", cursor: "pointer", zIndex: 15 }}
            >
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${tc}22`, border: `2px solid ${tc}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, boxShadow: `0 0 8px ${tc}88` }}>📰</div>
            </div>
          );
        })}
        {layers.osint && pts.osint.map((ev) => {
          const c = confColor(ev.confidence);
          return (
            <div key={ev.id} onClick={(e) => { e.stopPropagation(); onOsintSelect(ev); setSelectedNews(null); }}
              style={{ position: "absolute", left: ev.x, top: ev.y, transform: "translate(-50%,-50%)", pointerEvents: "auto", cursor: "pointer", zIndex: 14 }}
            >
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: `${c}22`, border: `1.5px dashed ${c}88`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: c, fontFamily: "JetBrains Mono", fontWeight: 700, boxShadow: `0 0 8px ${c}44` }}>
                {Math.round(ev.confidence * 100)}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes sitePulse { 0%{transform:translate(-50%,-50%) scale(.82);opacity:.85;} 70%{transform:translate(-50%,-50%) scale(1.38);opacity:0;} 100%{transform:translate(-50%,-50%) scale(1.38);opacity:0;} }
        .cesium-widget,.cesium-widget canvas,.cesium-viewer,.cesium-viewer-cesiumWidgetContainer{width:100%;height:100%;}
        .cesium-widget canvas:focus{outline:none;}
        .cesium-viewer-bottom{display:none!important;}
      `}</style>
      <NewsModal news={selectedNews} onClose={() => setSelectedNews(null)} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  右侧面板
// ══════════════════════════════════════════════════════════════
function TrendChart({ dailyData }) {
  if (!dailyData) return null;
  const { dates, aci, dci } = dailyData;
  const n = dates.length, W = 268, H = 52;
  const path = (vals) => vals.map((v,i) => `${i?"L":"M"}${((i/(n-1))*W).toFixed(1)},${(H-(v/100)*H).toFixed(1)}`).join(" ");
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#1e3a5f", marginBottom: 4 }}>
        <span>{dates[0]}</span>
        <div style={{ display: "flex", gap: 10 }}><span style={{ color: "#22c55e" }}>— ACI</span><span style={{ color: "#0ea5e9" }}>— DCI</span></div>
        <span>{dates[n-1]}</span>
      </div>
      <svg width={W} height={H} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="gACI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" /></linearGradient>
          <linearGradient id="gDCI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.18" /><stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25,0.5,0.75].map((r) => <line key={r} x1={0} y1={H*(1-r)} x2={W} y2={H*(1-r)} stroke="#0a1628" strokeWidth={0.5} />)}
        <path d={`${path(dci)} L${W},${H} L0,${H} Z`} fill="url(#gDCI)" />
        <path d={`${path(aci)} L${W},${H} L0,${H} Z`} fill="url(#gACI)" />
        <path d={path(dci)} fill="none" stroke="#0ea5e9" strokeWidth={1.5} />
        <path d={path(aci)} fill="none" stroke="#22c55e" strokeWidth={1.5} />
        <circle cx={W} cy={H-(aci[n-1]/100)*H} r={3} fill="#22c55e" />
        <circle cx={W} cy={H-(dci[n-1]/100)*H} r={3} fill="#0ea5e9" />
      </svg>
    </div>
  );
}

function RadarChart({ dims, color, hoveredDim, onHover }) {
  const S=148, cx=74, cy=74, r=54;
  const angles = dims.map((_,i) => (i/dims.length)*Math.PI*2 - Math.PI/2);
  const pt = (ratio,i) => [cx+r*ratio*Math.cos(angles[i]), cy+r*ratio*Math.sin(angles[i])];
  return (
    <svg width={S} height={S} style={{ overflow: "visible" }}>
      {[0.25,0.5,0.75,1].map((ratio) => <polygon key={ratio} points={dims.map((_,i)=>pt(ratio,i).join(",")).join(" ")} fill="none" stroke="#1a2d45" strokeWidth={0.5} />)}
      {dims.map((_,i) => <line key={i} x1={cx} y1={cy} x2={pt(1,i)[0]} y2={pt(1,i)[1]} stroke="#1a2d45" strokeWidth={0.5} />)}
      <polygon points={dims.map((d,i)=>pt(d.val/100,i).join(",")).join(" ")} fill={`${color}18`} stroke={color} strokeWidth={1.5} />
      {dims.map((d,i) => {
        const isH=hoveredDim===d.key, [px,py]=pt(d.val/100,i), [lx,ly]=pt(1.32,i);
        return (
          <g key={i} style={{ cursor:"default" }} onMouseEnter={()=>onHover(d.key)} onMouseLeave={()=>onHover(null)}>
            <circle cx={px} cy={py} r={isH?4.5:3} fill={isH?color:`${color}88`} style={{ transition:"r 0.15s" }} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={isH?9:8} fill={isH?"#e2e8f0":"#475569"} fontFamily="JetBrains Mono" style={{ transition:"all 0.15s" }}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TabIntel({ site, navigate }) {
  const [expandedEvent, setExpandedEvent] = useState(null);
  const related = EVENTS.filter((e) => e.siteId === site.id && e.verified);
  const sc = statusColor(site.status);
  const svTag = { S:"#ef4444", A:"#f59e0b" }[site.strategicValue] ?? "#22c55e";
  return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ padding: "10px 12px", background: "#060d1a", border: "1px solid #1a2d45", borderRadius: 4, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: sc, boxShadow: `0 0 7px ${sc}`, animation: "sPulse 2s ease-in-out infinite", flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: sc, fontWeight: 600 }}>{statusLabel(site.status)}</span>
          </div>
          <span style={{ padding: "2px 7px", borderRadius: 2, fontSize: 9, fontWeight: 700, background: `${svTag}1a`, border: `1px solid ${svTag}66`, color: svTag }}>战略 {site.strategicValue} 级</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 3 }}>{site.name}</div>
        <div style={{ fontSize: 9, color: "#475569" }}>{site.country} · {site.type}</div>
        <div style={{ fontSize: 8, color: "#1e3a5f", marginTop: 2, fontFamily: "JetBrains Mono" }}>{site.lat?.toFixed(4)}°N &nbsp; {site.lng?.toFixed(4)}°E</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 8 }}>核心能力指数</div>
        {[{ key:"ACI", label:"攻击能力指数", val:site.aci, color:"#22c55e" },{ key:"DCI", label:"防御能力指数", val:site.dci, color:"#0ea5e9" }].map(({ key, label, val, color: c }) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 9, color: c, fontFamily: "JetBrains Mono", fontWeight: 700, letterSpacing: "0.06em" }}>{key}</span>
                <span style={{ fontSize: 8, color: "#334155" }}>{label}</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color: c, fontFamily: "JetBrains Mono", lineHeight: 1 }}>{val}</span>
            </div>
            <div style={{ height: 4, background: "#0a1628", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${val}%`, height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${c}55,${c})`, boxShadow: `0 0 8px ${c}44`, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>
          </div>
        ))}
      </div>
      {site.dailyData && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 6 }}>能力趋势 · 7日</div>
          <TrendChart dailyData={site.dailyData} />
        </div>
      )}
      {related.length > 0 && (
        <div style={{ borderTop: "1px solid #0f1e30", paddingTop: 12 }}>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 8 }}>信实链关联事件 · {related.length} 条</div>
          {related.map((e) => {
            const isExp = expandedEvent === e.id;
            return (
              <div key={e.id} style={{ marginBottom: 5, background: "#060d1a", border: "1px solid #1e3a5f", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", cursor: "pointer" }} onClick={() => setExpandedEvent(isExp ? null : e.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.label?.replace("\n"," ")}</div>
                    <div style={{ fontSize: 8, color: "#334155", marginTop: 2 }}>{e.date} · {e.source}</div>
                  </div>
                  <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink:0, marginLeft:8, transform:isExp?"rotate(180deg)":"none", transition:"transform 0.2s" }}>
                    <polyline points="1,3 5,7 9,3" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                {isExp && (
                  <div style={{ padding: "0 10px 10px", borderTop: "1px solid #0d1a2e" }}>
                    <div style={{ fontSize: 9, color: "#64748b", lineHeight: 1.6, marginTop: 8, marginBottom: 8 }}>{e.content ?? "暂无详细描述"}</div>
                    <button onClick={() => navigate("/chain")} style={{ padding: "3px 10px", fontSize: 9, background: "#22c55e15", border: "1px solid #22c55e44", color: "#22c55e", borderRadius: 2, cursor: "pointer" }}>→ 信实链</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes sPulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

function TabStrike({ site, perSiteWeapon, allWeaponsBySite }) {
  const [hoveredDim, setHoveredDim] = useState(null);
  const color = scoreColor(site.combatScore ?? site.aci);
  const dims = [
    { key:"fire",      label:"火力", val:site.combatScore ?? 70 },
    { key:"maneuver",  label:"机动", val:Math.round((site.combatScore ?? 70)*0.85) },
    { key:"air",       label:"防空", val:Math.round((site.combatScore ?? 70)*0.72) },
    { key:"intel",     label:"情报", val:Math.round((site.combatScore ?? 70)*0.91) },
    { key:"logistics", label:"后勤", val:Math.round((site.combatScore ?? 70)*0.78) },
  ];
  const weapons        = allWeaponsBySite[site.id] ?? [];
  const activeWeaponId = perSiteWeapon[site.id] ?? null;
  const activeWeapon   = weapons.find((w) => w.id === activeWeaponId);
  const totalActive    = Object.values(perSiteWeapon).filter(Boolean).length;

  return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ padding: "12px", background: "#060d1a", border: `1px solid ${color}33`, borderRadius: 4, marginBottom: 12, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 8, color: "#475569", letterSpacing: "0.08em", marginBottom: 2 }}>综合战力</div>
          <div style={{ fontSize: 42, fontWeight: 800, color, fontFamily: "JetBrains Mono", lineHeight: 1, textShadow: `0 0 18px ${color}55` }}>{site.combatScore ?? site.aci}</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {dims.map((d) => {
            const dc=scoreColor(d.val), isH=hoveredDim===d.key;
            return (
              <div key={d.key} onMouseEnter={()=>setHoveredDim(d.key)} onMouseLeave={()=>setHoveredDim(null)} style={{ cursor:"default" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <span style={{ fontSize:8, color:isH?"#e2e8f0":"#475569", transition:"color 0.15s" }}>{d.label}</span>
                  <span style={{ fontSize:9, color:dc, fontFamily:"JetBrains Mono", fontWeight:700 }}>{d.val}</span>
                </div>
                <div style={{ height:isH?4:3, background:"#0a1628", borderRadius:2, transition:"height 0.15s" }}>
                  <div style={{ width:`${d.val}%`, height:"100%", background:`linear-gradient(90deg,${dc}55,${dc})`, borderRadius:2, boxShadow:isH?`0 0 6px ${dc}88`:"none", transition:"all 0.15s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
        <RadarChart dims={dims} color={color} hoveredDim={hoveredDim} onHover={setHoveredDim} />
      </div>
      <div style={{ borderTop:"1px solid #0f1e30", paddingTop:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:9, color:"#475569", letterSpacing:"0.1em" }}>打击半径</div>
          {totalActive > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:4, padding:"2px 7px", background:"#ef444415", border:"1px solid #ef444433", borderRadius:10 }}>
              <div style={{ width:4, height:4, borderRadius:"50%", background:"#ef4444", animation:"sPulse 1.4s ease-in-out infinite" }} />
              <span style={{ fontSize:8, color:"#ef4444", fontFamily:"JetBrains Mono" }}>{totalActive} 点位激活中</span>
            </div>
          )}
        </div>
        <div style={{ padding:"10px 12px", background:"#060d1a", border:"1px solid #1a2d45", borderRadius:4, marginBottom:10 }}>
          <div style={{ fontSize:8, color:"#334155", marginBottom:6 }}>当前点位 · {site.name}</div>
          {activeWeapon ? (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:activeWeapon.color, boxShadow:`0 0 6px ${activeWeapon.color}`, animation:"sPulse 1.4s ease-in-out infinite" }} />
              <span style={{ fontSize:10, color:"#e2e8f0", fontWeight:600 }}>{activeWeapon.name}</span>
              <span style={{ fontSize:9, color:activeWeapon.color, fontFamily:"JetBrains Mono", marginLeft:"auto" }}>{activeWeapon.rangeKm} km</span>
            </div>
          ) : (
            <div style={{ fontSize:9, color:"#334155" }}>未激活 · 点击地图点位标记选择武器</div>
          )}
        </div>
        <div style={{ padding:"8px 10px", background:"#040c18", border:"1px solid #1e3a5f", borderLeft:"2px solid #0ea5e955", borderRadius:3 }}>
          <div style={{ fontSize:8, color:"#475569", marginBottom:3 }}>操作说明</div>
          <div style={{ fontSize:8, color:"#334155", lineHeight:1.8 }}>
            ① 点击地图上的点位标记圆圈<br />
            ② 在弹出浮窗中选择武器类型<br />
            ③ 半径圆在 Cesium 地球上实时显示<br />
            ④ 多个点位可同时开启不同武器圈
          </div>
        </div>
      </div>
    </div>
  );
}

function TabDamage({ site }) {
  const avgDamage = site.facilities?.length ? Math.round(site.facilities.reduce((s,f)=>s+(f.damage??0),0)/site.facilities.length) : 0;
  const dmgColor = avgDamage>60?"#ef4444":avgDamage>20?"#f59e0b":"#22c55e";
  return (
    <div style={{ padding:"12px 14px" }}>
      <div style={{ display:"flex", gap:7, marginBottom:12 }}>
        {[{ label:"平均损毁", val:`${avgDamage}%`, color:dmgColor },{ label:"卫星验证", val:`${site.facilities?.filter(f=>f.verified).length??0}/${site.facilities?.length??0}`, color:"#0ea5e9" }].map(({ label, val, color: c }) => (
          <div key={label} style={{ flex:1, padding:"9px 10px", background:"#060d1a", border:`1px solid ${c}2a`, borderRadius:4 }}>
            <div style={{ fontSize:7, color:"#475569", letterSpacing:"0.08em", marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:c, fontFamily:"JetBrains Mono", lineHeight:1 }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:9, color:"#475569", letterSpacing:"0.1em", marginBottom:8 }}>设施状态</div>
      {(site.facilities??[]).map((f,i) => {
        const fc=f.damage>60?"#ef4444":f.damage>20?"#f59e0b":"#22c55e";
        return (
          <div key={i} style={{ marginBottom:9 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:8, color:f.verified?"#22c55e":"#334155" }}>{f.verified?"✓":"◌"}</span>
                <span style={{ fontSize:10, color:"#94a3b8" }}>{f.name}</span>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:fc, fontFamily:"JetBrains Mono" }}>{f.damage>0?`${f.damage}%`:"完好"}</span>
            </div>
            <div style={{ height:4, background:"#0a1628", borderRadius:2 }}>
              <div style={{ width:`${f.damage}%`, height:"100%", borderRadius:2, background:`linear-gradient(90deg,${fc}55,${fc})`, boxShadow:f.damage>0?`0 0 5px ${fc}55`:"none", transition:"width 0.7s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SiteDetailPanel({ site, perSiteWeapon, allWeaponsBySite, navigate }) {
  const [tab, setTab] = useState("intel");
  useEffect(() => { setTab("intel"); }, [site?.id]);
  if (!site) return null;
  const sc = statusColor(site.status);
  const totalActive = Object.values(perSiteWeapon).filter(Boolean).length;
  const TABS = [{ id:"intel", label:"情报" },{ id:"strike", label:"打击" },{ id:"damage", label:"损毁" }];
  return (
    <div style={{ width:314, flexShrink:0, background:"#040810", borderLeft:"1px solid #1a2d45", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ flexShrink:0, borderBottom:"1px solid #1a2d45" }}>
        <div style={{ padding:"10px 14px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:sc, boxShadow:`0 0 6px ${sc}`, flexShrink:0 }} />
            <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{site.name}</div>
            {totalActive > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:4, padding:"2px 7px", background:"#ef444415", border:"1px solid #ef444433", borderRadius:10, flexShrink:0 }}>
                <div style={{ width:4, height:4, borderRadius:"50%", background:"#ef4444", animation:"sPulse 1.4s ease-in-out infinite" }} />
                <span style={{ fontSize:8, color:"#ef4444", fontFamily:"JetBrains Mono" }}>{totalActive} 圈</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display:"flex", paddingLeft:14 }}>
          {TABS.map((t) => {
            const active = tab===t.id;
            return <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"7px 18px", background:"transparent", border:"none", borderBottom:`2px solid ${active?"#0ea5e9":"transparent"}`, color:active?"#0ea5e9":"#475569", fontSize:10, fontWeight:active?700:400, cursor:"pointer", letterSpacing:"0.06em", transition:"all 0.15s" }}>{t.label}</button>;
          })}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        {tab==="intel"  && <TabIntel  site={site} navigate={navigate} />}
        {tab==="strike" && <TabStrike site={site} perSiteWeapon={perSiteWeapon} allWeaponsBySite={allWeaponsBySite} />}
        {tab==="damage" && <TabDamage site={site} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SitePackage — 主组件
// ══════════════════════════════════════════════════════════════
export default function SitePackage() {
  const { siteId } = useParams();
  const navigate   = useNavigate();

  const [theaterId,      setTheaterId]      = useState("iran");
  const [theaters,       setTheaters]       = useState([]);
  const [sites,          setSites]          = useState([]);
  const [siteDetail,     setSiteDetail]     = useState(null);
  const [timeline,       setTimeline]       = useState([]);
  const [selectedId,     setSelectedId]     = useState(null);
  const [imgIdx,         setImgIdx]         = useState(0);
  const [selectedOsint,  setSelectedOsint]  = useState(null);
  const [layers,         setLayers]         = useState({ basemap:"combat", sites:true, news:true, osint:true, satellite:true });
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [perSiteWeapon,  setPerSiteWeapon]  = useState({});  // { [siteId]: weaponId | null }
  const [allWeaponsBySite, setAllWeaponsBySite] = useState({});
  const [popup, setPopup] = useState(null); // { site, x, y }

  const sharedViewerRef = useRef(null);
  const sharedCesiumRef = useRef(null);

  useEffect(() => {
    fetch("/api/theaters").then((r)=>r.json()).then(setTheaters).catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`/api/theaters/${theaterId}/sites`)
      .then((r)=>r.json())
      .then((data) => {
        setSites(data);
        setSelectedId(data[0]?.id ?? null);
        setImgIdx(0); setSelectedOsint(null); setPopup(null); setPerSiteWeapon({});
        const wb = {};
        data.forEach((s) => { wb[s.id] = deriveWeapons(s); });
        setAllWeaponsBySite(wb);
      }).catch(console.error);
  }, [theaterId]);

  useEffect(() => {
    if (!selectedId) return;
    setTimeline([]);
    fetch(`/api/sites/${selectedId}`).then((r)=>r.json()).then((detail) => {
      setSiteDetail(detail);
      setAllWeaponsBySite((prev) => ({ ...prev, [selectedId]: deriveWeapons(detail) }));
    }).catch(console.error);
    fetch(`/api/sites/${selectedId}/timeline`).then((r)=>r.json()).then(setTimeline).catch(console.error);
  }, [selectedId]);

  const FALLBACK_CAMERAS = { iran:{ lng:48, lat:32, alt:4200000 }, japan:{ lng:136, lat:36, alt:2800000 } };
  const theater = theaters.find((t)=>t.id===theaterId) ?? { camera: FALLBACK_CAMERAS[theaterId] ?? FALLBACK_CAMERAS.iran };
  const newsMarkers = [], osintEvents = [];
  const site  = siteDetail;
  const color = scoreColor(site?.combatScore ?? 0);

  useEffect(() => { if (siteId) setSelectedId(siteId); setImgIdx(0); }, [siteId]);

  const handleTheaterChange = useCallback((newId) => {
    setTheaterId(newId); setImgIdx(0); setSelectedOsint(null); setPopup(null); setPerSiteWeapon({});
  }, []);

  const selectSite = (id) => { setSelectedId(id); setImgIdx(0); setSelectedOsint(null); };
  const handleMapClick = useCallback(() => { setLayerPanelOpen(false); setPopup(null); }, []);
  const handleSiteMarkerClick = useCallback((site, x, y) => {
    setPopup((prev) => (prev?.site?.id === site.id ? null : { site, x, y }));
  }, []);
  const handleWeaponSelect = useCallback((siteId, weaponId) => {
    setPerSiteWeapon((prev) => ({ ...prev, [siteId]: weaponId ?? null }));
  }, []);

  const activeImgItems  = timeline.length > 0 ? timeline : (site?.imagery ?? []);
  const activeImg       = activeImgItems[imgIdx] ?? activeImgItems[0] ?? {};
  const activeImgDate   = activeImg.create_time ? activeImg.create_time.split(" ")[0] : (activeImg.date ?? "");
  const activeImgTime   = activeImg.create_time ? activeImg.create_time.replace(" ","T") : null;
  const activeNumericId = site?.numeric_id ?? site?.numericId ?? null;

  if (!site) return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      <BaseList sites={sites} selectedId={selectedId} onSelect={selectSite} theaterId={theaterId} onTheaterChange={handleTheaterChange} theaters={theaters} />
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#334155", fontSize:12 }}>加载中...</div>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      <BaseList sites={sites} selectedId={selectedId} onSelect={selectSite} theaterId={theaterId} onTheaterChange={handleTheaterChange} theaters={theaters} />
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <div style={{ flex:1, position:"relative" }} onClick={handleMapClick}>
          <SiteMap
            sites={sites} selectedId={selectedId} onSelect={selectSite}
            osintEvents={osintEvents} newsMarkers={newsMarkers}
            onOsintSelect={(ev)=>setSelectedOsint(ev)}
            theaterCamera={theater.camera} layers={layers}
            activeImgTime={activeImgTime} activeNumericId={activeNumericId}
            onReady={(vRef,cRef)=>{ sharedViewerRef.current=vRef.current; sharedCesiumRef.current=cRef.current; }}
            onSiteMarkerClick={handleSiteMarkerClick}
            perSiteWeapon={perSiteWeapon}
            allWeaponsBySite={allWeaponsBySite}
          />

          {popup && (
            <SitePopup
              site={popup.site} x={popup.x} y={popup.y}
              weapons={allWeaponsBySite[popup.site.id] ?? []}
              activeWeaponId={perSiteWeapon[popup.site.id] ?? null}
              onSelect={handleWeaponSelect}
              onClose={()=>setPopup(null)}
            />
          )}

          <OsintCard event={selectedOsint} onClose={()=>setSelectedOsint(null)} />

          {/* 左上角图例 */}
          <div style={{ position:"absolute", top:12, left:12, zIndex:1000, background:"rgba(4,8,16,0.88)", border:"1px solid #1a2d45", padding:"10px 14px", borderRadius:4, backdropFilter:"blur(8px)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10, paddingBottom:8, borderBottom:"1px solid #0d1a2e" }}>
              <span style={{ fontSize:14 }}>{theater.flag}</span>
              <div><div style={{ fontSize:10, color:"#0ea5e9", letterSpacing:"0.12em" }}>当前专题</div></div>
            </div>
            <div style={{ fontSize:9, color:"#64748b", marginBottom:6, letterSpacing:"0.1em" }}>基地状态</div>
            {[["#22c55e","运行中"],["#f59e0b","受损"],["#ef4444","被摧毁"]].map(([c,l])=>(
              <div key={l} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, fontSize:10 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:c }} /><span style={{ color:c }}>{l}</span>
              </div>
            ))}
            <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #0d1a2e", fontSize:8, color:"#334155", letterSpacing:"0.06em" }}>
              {layers.basemap==="own"?"🛰 自有底图 + 路网":"🗺 作战绘制图层"}
            </div>
          </div>

          {/* 图层按钮 */}
          <div style={{ position:"absolute", bottom:84, left:12, zIndex:1100 }} onClick={(e)=>e.stopPropagation()}>
            {layerPanelOpen && (
              <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:0 }}>
                <LayerPanel layers={layers} onLayersChange={setLayers} />
              </div>
            )}
            <LayerToggleButton open={layerPanelOpen} onClick={()=>setLayerPanelOpen((o)=>!o)} layers={layers} />
          </div>

          {/* 底部影像时间轴 */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:1000, background:"rgba(4,8,16,0.9)", borderTop:"1px solid #1a2d45", padding:"12px 16px", display:"flex", alignItems:"center", gap:12, backdropFilter:"blur(8px)" }}>
            <div style={{ fontSize:9, color:"#64748b", letterSpacing:"0.1em", flexShrink:0 }}>影像时间轴</div>
            <div style={{ display:"flex", gap:8, flex:1, overflowX:"auto" }}>
              {activeImgItems.map((item,i) => {
                const itemDate  = item.create_time ? item.create_time.split(" ")[0] : item.date;
                const itemLabel = item.label ?? `影像 #${item.image_id}`;
                return (
                  <div key={item.id??i} onClick={()=>setImgIdx(i)}
                    style={{ flexShrink:0, padding:"8px 14px", borderRadius:3, cursor:"pointer", background:imgIdx===i?`${color}22`:"#080f1e", border:`1px solid ${imgIdx===i?color:"#1a2d45"}`, transition:"all 0.15s" }}
                  >
                    <div style={{ fontSize:10, fontWeight:700, color:imgIdx===i?color:"#94a3b8" }}>{itemDate}</div>
                    <div style={{ fontSize:9, color:"#64748b", marginTop:2 }}>{itemLabel}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <SiteDetailPanel
          site={site}
          perSiteWeapon={perSiteWeapon}
          allWeaponsBySite={allWeaponsBySite}
          navigate={navigate}
        />
      </div>
      <style>{`@keyframes scanline{0%{top:0}100%{top:100%}}`}</style>
    </div>
  );
}