import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { EVENTS } from "../../data/mockData";

// ── 颜色工具 ─────────────────────────────────────────────────
const STATUS_COLOR = {
  operational: "#22c55e",
  damaged: "#f59e0b",
  destroyed: "#ef4444",
};
const STATUS_LABEL = {
  operational: "运行中",
  damaged: "受损",
  destroyed: "被摧毁",
};
const TYPE_COLOR = {
  military: "#ef4444",
  verified: "#22c55e",
  news: "#f59e0b",
  infrastructure: "#0ea5e9",
};
const TYPE_LABEL = {
  military: "军事动态",
  verified: "已验证",
  news: "新闻报道",
  infrastructure: "基础设施",
};

const statusColor = (s) => STATUS_COLOR[s] ?? "#ef4444";
const statusLabel = (s) => STATUS_LABEL[s] ?? "被摧毁";
const scoreColor = (v) =>
  v >= 80 ? "#22c55e" : v >= 60 ? "#f59e0b" : v >= 40 ? "#f97316" : "#ef4444";
const confColor = (v) =>
  v >= 0.7 ? "#22c55e" : v >= 0.45 ? "#f59e0b" : "#ef4444";

// ── 瓦片地址 ─────────────────────────────────────────────────
const TIANDITU_TOKEN = "2bac672b2cdbc6986edde89f55058e28";
const getTiandituUrl = () =>
  `/tianditu-proxy/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_TOKEN}`;
const getBaseMapUrl = () =>
  window.__USE_BASEMAP_PROXY__
    ? "/worldmap/getdata?x={x}&y={y}&l={z}"
    : `http://${window.BASE_MAP_ADDRESS ?? import.meta.env?.VITE_BASE_MAP_ADDRESS ?? "124.70.78.85"}:${window.BASE_MAP_PORT ?? import.meta.env?.VITE_BASE_MAP_PORT ?? "9998"}/getdata?x={x}&y={y}&l={z}`;
const COMBAT_MAP_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

// 卫星影像：直接访问真实 IP:port（由 vite.config define 注入，或回退到默认值）
const SAT_MK = "15a2cd5b39d410616803f21d639ab9d0";
const SAT_TK = "82a2673880cdfd3e75a63f2b5ad42ff4";
const SAT_HOST =
  typeof __SAT_HOST__ !== "undefined" ? __SAT_HOST__ : "1.94.249.221";
const SAT_PORT = typeof __SAT_PORT__ !== "undefined" ? __SAT_PORT__ : "8095";
const SAT_BASE = `http://${SAT_HOST}:${SAT_PORT}`;

const getSatUrl = (numericId, timeStr) => {
  const t = encodeURIComponent(timeStr);
  return `${SAT_BASE}/targetpointmap/getImage/{z}/{x}/{y}?mk=${SAT_MK}&tk=${SAT_TK}&pointId=${numericId}&time=${t}&size=256`;
};

// 探测用（拼具体 z/x/y，不用模板占位符）
const getSatProbeUrl = (numericId, timeStr, z, x, y) => {
  const t = encodeURIComponent(timeStr);
  return `${SAT_BASE}/targetpointmap/getImage/${z}/${x}/${y}?mk=${SAT_MK}&tk=${SAT_TK}&pointId=${numericId}&time=${t}&size=256`;
};

// 经纬度 → 瓦片 x/y（Web Mercator XYZ）
function lngLatToTile(lng, lat, z) {
  const n = Math.pow(2, z); // 该层级列数
  const rows = Math.pow(2, z - 1); // 4326 行数是列数的一半
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((90 - lat) / 180) * rows);
  return { x, y };
}

// ── 坐标标准化 ────────────────────────────────────────────────
const warnedCoords = new Set();
const normCoord = (item) => {
  const lng = Number(item?.lng ?? item?.lon ?? item?.longitude);
  const lat = Number(item?.lat ?? item?.latitude);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    const k = String(item?.id ?? "?");
    if (!warnedCoords.has(k)) {
      console.warn("[overlay] 无效坐标:", item);
      warnedCoords.add(k);
    }
    return null;
  }
  return { lng, lat };
};

// ══════════════════════════════════════════════════════════════
//  LayerPanel
// ══════════════════════════════════════════════════════════════
function LayerPanel({ layers, onLayersChange }) {
  const basemapOptions = [
    {
      id: "combat",
      label: "作战绘制图层",
      desc: "CartoDB 暗色矢量底图",
      icon: "🗺",
    },
    {
      id: "own",
      label: '"吉林一号" 星座全球底图',
      desc: "卫星影像 + 天地图路网",
      icon: "🛰",
    },
  ];
  const overlayItems = [
    {
      id: "sites",
      label: "基地点位标记",
      desc: "ACI 指数 · 状态监控",
      icon: "◎",
      color: "#22c55e",
    },
    {
      id: "news",
      label: "新闻事件标记",
      desc: "多源新闻 · 实时更新",
      icon: "📰",
      color: "#f59e0b",
    },
    {
      id: "osint",
      label: "OSINT 情报标记",
      desc: "开源情报 · 置信度标注",
      icon: "◈",
      color: "#0ea5e9",
    },
    {
      id: "satellite",
      label: "点位包影像",
      desc: "点位影像 · 时间轴联动",
      icon: "🛸",
      color: "#8b5cf6",
    },
  ];

  const GroupHeader = ({ icon, label, count }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 14px 5px",
        borderBottom: "1px solid #0d1a2e",
      }}
    >
      <span style={{ fontSize: 10, color: "#334155" }}>{icon}</span>
      <span
        style={{
          fontSize: 9,
          color: "#64748b",
          letterSpacing: "0.12em",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 8, color: "#1e3a5f", marginLeft: "auto" }}>
        {count}
      </span>
    </div>
  );

  const RadioRow = ({ option, active, onClick }) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        background: active ? "rgba(14,165,233,0.08)" : "transparent",
        border: "none",
        borderBottom: "1px solid #0a1520",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!active)
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: `1.5px solid ${active ? "#0ea5e9" : "#334155"}`,
          background: active ? "#0ea5e9" : "transparent",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s",
        }}
      >
        {active && (
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#040810",
            }}
          />
        )}
      </div>
      <span style={{ fontSize: 12, lineHeight: 1, flexShrink: 0 }}>
        {option.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            color: active ? "#e2e8f0" : "#94a3b8",
            fontWeight: active ? 600 : 400,
          }}
        >
          {option.label}
        </div>
        <div style={{ fontSize: 8, color: "#334155", marginTop: 2 }}>
          {option.desc}
        </div>
      </div>
      {active && (
        <div
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "#0ea5e9",
            boxShadow: "0 0 6px #0ea5e9",
            flexShrink: 0,
          }}
        />
      )}
    </button>
  );

  const CheckRow = ({ item, checked, onToggle }) => (
    <button
      onClick={onToggle}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        background: checked ? `${item.color}08` : "transparent",
        border: "none",
        borderBottom: "1px solid #0a1520",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!checked)
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={(e) => {
        if (!checked) e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 2,
          border: `1.5px solid ${checked ? item.color : "#334155"}`,
          background: checked ? item.color : "transparent",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s",
        }}
      >
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <polyline
              points="1,3.5 3.5,6 8,1"
              stroke="#040810"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span
        style={{
          fontSize: 12,
          lineHeight: 1,
          flexShrink: 0,
          color: checked ? item.color : "#334155",
        }}
      >
        {item.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            color: checked ? "#e2e8f0" : "#64748b",
            fontWeight: checked ? 500 : 400,
          }}
        >
          {item.label}
        </div>
        <div style={{ fontSize: 8, color: "#334155", marginTop: 2 }}>
          {item.desc}
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          opacity: checked ? 0.8 : 0.25,
          fontSize: 10,
          color: checked ? item.color : "#64748b",
        }}
      >
        {checked ? "👁" : "🚫"}
      </div>
    </button>
  );

  return (
    <div
      style={{
        width: 230,
        background: "#040c18",
        border: "1px solid #1a2d45",
        borderRadius: 6,
        overflow: "hidden",
        boxShadow:
          "0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(14,165,233,0.08)",
        animation: "layerPanelIn 0.18s ease",
      }}
    >
      <div
        style={{
          padding: "10px 14px 8px",
          borderBottom: "1px solid #1a2d45",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect
            x="0"
            y="0"
            width="12"
            height="3"
            rx="1"
            fill="#0ea5e9"
            opacity="0.9"
          />
          <rect
            x="0"
            y="4.5"
            width="12"
            height="3"
            rx="1"
            fill="#0ea5e9"
            opacity="0.6"
          />
          <rect
            x="0"
            y="9"
            width="8"
            height="3"
            rx="1"
            fill="#0ea5e9"
            opacity="0.3"
          />
        </svg>
        <span
          style={{
            fontSize: 9,
            color: "#64748b",
            letterSpacing: "0.14em",
            fontWeight: 600,
          }}
        >
          LAYER CONTROL
        </span>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 5px #22c55e",
            }}
          />
          <span style={{ fontSize: 8, color: "#22c55e" }}>LIVE</span>
        </div>
      </div>
      <GroupHeader
        icon="⬛"
        label="底图图层"
        count={`${basemapOptions.length} 项 · 单选`}
      />
      {basemapOptions.map((opt) => (
        <RadioRow
          key={opt.id}
          option={opt}
          active={layers.basemap === opt.id}
          onClick={() => onLayersChange({ ...layers, basemap: opt.id })}
        />
      ))}
      <GroupHeader
        icon="📍"
        label="标注图层"
        count={`${overlayItems.length} 项 · 多选`}
      />
      {overlayItems.map((item) => (
        <CheckRow
          key={item.id}
          item={item}
          checked={layers[item.id]}
          onToggle={() =>
            onLayersChange({ ...layers, [item.id]: !layers[item.id] })
          }
        />
      ))}
      <div
        style={{
          padding: "7px 14px",
          borderTop: "1px solid #0d1a2e",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{ fontSize: 8, color: "#1e3a5f", letterSpacing: "0.08em" }}
        >
          {overlayItems.filter((i) => layers[i.id]).length}/
          {overlayItems.length} 标注可见
        </span>
        <button
          onClick={() =>
            onLayersChange({
              basemap: "combat",
              sites: true,
              news: true,
              osint: true,
              satellite: true,
            })
          }
          style={{
            fontSize: 8,
            color: "#334155",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            letterSpacing: "0.06em",
            padding: "2px 4px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
        >
          重置
        </button>
      </div>
      <style>{`@keyframes layerPanelIn { from{opacity:0;transform:translateY(8px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  LayerToggleButton
// ══════════════════════════════════════════════════════════════
function LayerToggleButton({ open, onClick, layers }) {
  const activeOverlays = ["sites", "news", "osint", "satellite"].filter(
    (k) => layers[k],
  ).length;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 12px",
        background: open ? "rgba(14,165,233,0.15)" : "rgba(4,8,16,0.88)",
        border: `1px solid ${open ? "#0ea5e9" : "#1a2d45"}`,
        borderRadius: 4,
        cursor: "pointer",
        backdropFilter: "blur(8px)",
        transition: "all 0.2s",
        boxShadow: open ? "0 0 16px rgba(14,165,233,0.2)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!open) {
          e.currentTarget.style.borderColor = "#0ea5e966";
          e.currentTarget.style.background = "rgba(14,165,233,0.06)";
        }
      }}
      onMouseLeave={(e) => {
        if (!open) {
          e.currentTarget.style.borderColor = "#1a2d45";
          e.currentTarget.style.background = "rgba(4,8,16,0.88)";
        }
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect
          x="1"
          y="1"
          width="12"
          height="3.5"
          rx="1"
          fill={open ? "#0ea5e9" : "#64748b"}
          opacity="1"
        />
        <rect
          x="1"
          y="5.3"
          width="12"
          height="3.5"
          rx="1"
          fill={open ? "#0ea5e9" : "#64748b"}
          opacity="0.65"
        />
        <rect
          x="1"
          y="9.5"
          width="8"
          height="3.5"
          rx="1"
          fill={open ? "#0ea5e9" : "#64748b"}
          opacity="0.35"
        />
      </svg>
      <span
        style={{
          fontSize: 10,
          color: open ? "#0ea5e9" : "#94a3b8",
          letterSpacing: "0.06em",
          fontFamily: "JetBrains Mono",
        }}
      >
        图层
      </span>
      <div
        style={{
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          background: open ? "#0ea5e9" : "#1a2d45",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 8,
          color: open ? "#040810" : "#64748b",
          fontWeight: 700,
          fontFamily: "JetBrains Mono",
          padding: "0 4px",
          transition: "all 0.2s",
        }}
      >
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
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid #1a2d45",
        position: "relative",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 10px",
          background: open ? "#0d1a2e" : "rgba(14,165,233,0.06)",
          border: `1px solid ${open ? "#0ea5e9" : "#1a2d45"}`,
          borderRadius: 4,
          cursor: "pointer",
          transition: "all 0.2s",
          outline: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ position: "relative", width: 8, height: 8 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "#0ea5e9",
                animation: "theaterPulse 2s ease-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "#0ea5e9",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 9,
              color: "#64748b",
              letterSpacing: "0.12em",
              fontFamily: "JetBrains Mono",
            }}
          >
            THEATER
          </span>
          <span style={{ fontSize: 10, color: "#e2e8f0", fontWeight: 600 }}>
            {current.flag} {current.label}
          </span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          style={{
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          <polyline
            points="2,4 6,8 10,4"
            fill="none"
            stroke="#64748b"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% - 2px)",
            left: 14,
            right: 14,
            zIndex: 2000,
            background: "#040810",
            border: "1px solid #0ea5e944",
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            animation: "dropDown 0.18s ease",
          }}
        >
          {theaters.map((theater, idx) => {
            const isActive = theater.id === currentId;
            return (
              <button
                key={theater.id}
                onClick={() => {
                  onChange(theater.id);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  background: isActive
                    ? "rgba(14,165,233,0.12)"
                    : "transparent",
                  border: "none",
                  borderTop: idx > 0 ? "1px solid #0d1a2e" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "rgba(14,165,233,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>
                  {theater.flag}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: isActive ? "#0ea5e9" : "#cbd5e1",
                      fontWeight: isActive ? 700 : 400,
                    }}
                  >
                    {theater.label}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: "#334155",
                      letterSpacing: "0.1em",
                      marginTop: 1,
                    }}
                  >
                    {theater.labelEn}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 8, color: "#334155" }}>
                    {theater.siteCount ?? "—"} 点位
                  </div>
                  {isActive && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        justifyContent: "flex-end",
                        marginTop: 2,
                      }}
                    >
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: "#22c55e",
                        }}
                      />
                      <span style={{ fontSize: 7, color: "#22c55e" }}>
                        ACTIVE
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
          <div
            style={{
              padding: "6px 12px",
              borderTop: "1px solid #0d1a2e",
              fontSize: 8,
              color: "#1e3a5f",
              letterSpacing: "0.08em",
            }}
          >
            ◈ {theaters.length} 专题已载入
          </div>
        </div>
      )}
      <style>{`
        @keyframes theaterPulse { 0%{transform:scale(1);opacity:.9} 60%{transform:scale(2.2);opacity:0} 100%{transform:scale(2.2);opacity:0} }
        @keyframes dropDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  BaseList
// ══════════════════════════════════════════════════════════════
function BaseList({
  sites,
  selectedId,
  onSelect,
  theaterId,
  onTheaterChange,
  theaters = [],
}) {
  const [filter, setFilter] = useState("all");
  const FILTERS = [
    ["all", "全部"],
    ["operational", "运行中"],
    ["damaged", "受损"],
    ["destroyed", "被摧毁"],
  ];
  const visible =
    filter === "all" ? sites : sites.filter((s) => s.status === filter);
  useEffect(() => {
    setFilter("all");
  }, [theaterId]);
  const theater = theaters.find((t) => t.id === theaterId) ?? theaters[0] ?? {};
  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: "#040810",
        borderRight: "1px solid #1a2d45",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TheaterSwitcher
        currentId={theaterId}
        onChange={onTheaterChange}
        theaters={theaters}
      />
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #1a2d45" }}>
        <div
          style={{
            fontSize: 9,
            color: "#64748b",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          SITUATION MAP · 监控点位
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FILTERS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                padding: "3px 8px",
                borderRadius: 2,
                cursor: "pointer",
                fontSize: 9,
                letterSpacing: "0.06em",
                background: filter === k ? "#f59e0b22" : "transparent",
                border: `1px solid ${filter === k ? "#f59e0b" : "#1a2d45"}`,
                color: filter === k ? "#f59e0b" : "#64748b",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {visible.map((site) => {
          const sc = statusColor(site.status),
            sel = site.id === selectedId;
          return (
            <div
              key={site.id}
              onClick={() => onSelect(site.id)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                borderBottom: "1px solid #0d1a2e",
                borderLeft: `2px solid ${sel ? sc : "transparent"}`,
                background: sel ? `${sc}0d` : "transparent",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 3,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: sc,
                    boxShadow: `0 0 4px ${sc}`,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: sel ? "#e2e8f0" : "#94a3b8",
                    fontWeight: sel ? 600 : 400,
                    lineHeight: 1.3,
                  }}
                >
                  {site.name}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingLeft: 15,
                }}
              >
                <span style={{ fontSize: 9, color: "#334155" }}>
                  {site.country}
                </span>
                <span style={{ fontSize: 9, color: sc }}>
                  {statusLabel(site.status)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid #1a2d45",
          fontSize: 9,
          color: "#1e3a5f",
          lineHeight: 1.6,
        }}
      >
        ◉ 卫星影像 → 事实基础层
        <br />
        点位数据锚定信实链节点
        <br />
        <span style={{ color: "#334155" }}>
          ◈ {theater.osintEvents?.length ?? 0} 条开源情报待验证
        </span>
      </div>
    </div>
  );
}

// ── 小组件 ────────────────────────────────────────────────────
function RadarChart({ site }) {
  const S = 140,
    cx = 70,
    cy = 70,
    r = 55;
  const dims = [
    ["火力", site.combatScore],
    ["机动", (site.combatScore * 0.85) | 0],
    ["防空", (site.combatScore * 0.72) | 0],
    ["情报", (site.combatScore * 0.91) | 0],
    ["后勤", (site.combatScore * 0.78) | 0],
  ];
  const angles = dims.map(
    (_, i) => (i / dims.length) * Math.PI * 2 - Math.PI / 2,
  );
  const pt = (ratio, i) => [
    cx + r * ratio * Math.cos(angles[i]),
    cy + r * ratio * Math.sin(angles[i]),
  ];
  const color = scoreColor(site.combatScore);
  return (
    <svg width={S} height={S}>
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <polygon
          key={ratio}
          points={dims.map((_, i) => pt(ratio, i).join(",")).join(" ")}
          fill="none"
          stroke="#1a2d45"
          strokeWidth={0.5}
        />
      ))}
      {dims.map((_, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={pt(1, i)[0]}
          y2={pt(1, i)[1]}
          stroke="#1a2d45"
          strokeWidth={0.5}
        />
      ))}
      <polygon
        points={dims.map(([, v], i) => pt(v / 100, i).join(",")).join(" ")}
        fill={`${color}33`}
        stroke={color}
        strokeWidth={1.5}
      />
      {dims.map(([l], i) => (
        <text
          key={i}
          x={pt(1.25, i)[0]}
          y={pt(1.25, i)[1]}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={8}
          fill="#64748b"
          fontFamily="JetBrains Mono"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}

function DualScore({ aci, dci }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
      {[
        ["ACI", "攻击能力指数", aci],
        ["DCI", "防御能力指数", dci],
      ].map(([key, label, val]) => {
        const c = val >= 80 ? "#22c55e" : val >= 60 ? "#f59e0b" : "#ef4444";
        return (
          <div
            key={key}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 4,
              background: `${c}11`,
              border: `1px solid ${c}44`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 8,
                color: "#64748b",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              {key}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: c,
                fontFamily: "var(--font-display)",
                lineHeight: 1,
              }}
            >
              {val}
            </div>
            <div style={{ fontSize: 8, color: "#334155", marginTop: 4 }}>
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DualTrendChart({ dailyData }) {
  const W = 280,
    H = 60,
    { dates, aci, dci } = dailyData,
    n = dates.length;
  const path = (vals) =>
    vals
      .map(
        (v, i) =>
          `${i ? "L" : "M"}${((i / (n - 1)) * W).toFixed(1)},${(H - (v / 100) * H).toFixed(1)}`,
      )
      .join(" ");
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 8,
          color: "#334155",
          marginBottom: 3,
        }}
      >
        <span>{dates[0]}</span>
        <span style={{ display: "flex", gap: 10 }}>
          <span style={{ color: "#22c55e" }}>— ACI</span>
          <span style={{ color: "#0ea5e9" }}>— DCI</span>
        </span>
        <span>{dates[n - 1]}</span>
      </div>
      <svg
        width={W}
        height={H}
        style={{ overflow: "visible", display: "block" }}
      >
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <line
            key={r}
            x1={0}
            y1={H * (1 - r)}
            x2={W}
            y2={H * (1 - r)}
            stroke="#0d1a2e"
            strokeWidth={0.5}
          />
        ))}
        <path d={path(dci)} fill="none" stroke="#0ea5e9" strokeWidth={1.5} />
        <path d={path(aci)} fill="none" stroke="#22c55e" strokeWidth={1.5} />
        <circle cx={W} cy={H - (aci[n - 1] / 100) * H} r={3} fill="#22c55e" />
        <circle cx={W} cy={H - (dci[n - 1] / 100) * H} r={3} fill="#0ea5e9" />
      </svg>
    </div>
  );
}

function DamageStatus({ status }) {
  const MAP = {
    operational: ["完好无损", "#22c55e", "✓"],
    damaged: ["受损", "#f59e0b", "⚠"],
    destroyed: ["严重损毁", "#ef4444", "✕"],
  };
  const [label, color, icon] = MAP[status] ?? MAP.operational;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 2,
        background: `${color}15`,
        border: `1px solid ${color}44`,
        fontSize: 10,
        color,
      }}
    >
      {icon} {label}
    </div>
  );
}

function FacilitiesList({ facilities }) {
  return (
    <div>
      {facilities.map((f, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 3,
              fontSize: 10,
            }}
          >
            <span style={{ color: "#94a3b8" }}>{f.name}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 9,
                  color: f.verified ? "#22c55e" : "#334155",
                }}
              >
                {f.verified ? "✓ 卫星验证" : "◌ 待核实"}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: f.damage > 0 ? "#ef4444" : "#22c55e",
                }}
              >
                {f.damage > 0 ? `损毁 ${f.damage}%` : "完好"}
              </span>
            </span>
          </div>
          <div style={{ height: 3, background: "#0d1a2e", borderRadius: 2 }}>
            <div
              style={{
                width: `${f.damage}%`,
                height: "100%",
                borderRadius: 2,
                background:
                  f.damage > 60
                    ? "#ef4444"
                    : f.damage > 20
                      ? "#f59e0b"
                      : "#22c55e",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RelatedEvents({ siteId, onNavigate }) {
  const related = EVENTS.filter((e) => e.siteId === siteId && e.verified);
  if (!related.length) return null;
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          color: "#64748b",
          letterSpacing: "0.1em",
          marginBottom: 8,
        }}
      >
        信实链关联事件 · 卫星已锚定
      </div>
      {related.map((e) => (
        <div
          key={e.id}
          style={{
            padding: "8px 10px",
            marginBottom: 4,
            background: "#080f1e",
            borderRadius: 3,
            border: "1px solid #1e3a5f",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: "#e2e8f0" }}>
              {e.label.replace("\n", " ")}
            </div>
            <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>
              {e.date} · {e.source}
            </div>
          </div>
          <button
            onClick={onNavigate}
            style={{
              padding: "3px 8px",
              fontSize: 9,
              background: "#22c55e15",
              border: "1px solid #22c55e44",
              color: "#22c55e",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            → 链
          </button>
        </div>
      ))}
    </div>
  );
}

function NewsModal({ news, onClose }) {
  if (!news) return null;
  const tc = TYPE_COLOR[news.type] ?? "#94a3b8",
    tl = TYPE_LABEL[news.type] ?? "信息";
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#040810",
          border: "1px solid #1a2d45",
          borderRadius: 6,
          padding: 24,
          maxWidth: 500,
          maxHeight: "70vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 3,
                background: `${tc}22`,
                border: `1px solid ${tc}44`,
                color: tc,
                fontSize: 9,
                fontWeight: 700,
                marginBottom: 8,
                letterSpacing: "0.08em",
              }}
            >
              {tl}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#e2e8f0",
                lineHeight: 1.4,
              }}
            >
              {news.title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: 20,
              cursor: "pointer",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 16,
            fontSize: 9,
            color: "#64748b",
            borderBottom: "1px solid #0d1a2e",
            paddingBottom: 12,
          }}
        >
          <span>📅 {news.date}</span>
          <span>📡 {news.source}</span>
        </div>
        <div style={{ fontSize: 11, color: "#c7d2e0", lineHeight: 1.6 }}>
          {news.content}
        </div>
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#0d1a2e",
            borderRadius: 3,
            fontSize: 9,
            color: "#94a3b8",
          }}
        >
          📍 {news.lat.toFixed(2)}° N, {news.lng.toFixed(2)}° E
        </div>
      </div>
    </div>
  );
}

function OsintCard({ event, onClose }) {
  if (!event) return null;
  const c = confColor(event.confidence);
  const srcLabel =
    {
      social: "社交媒体",
      news: "新闻媒体",
      official: "官方声明",
      anonymous: "匿名信源",
    }[event.sourceType] ?? "OSINT";
  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        width: 320,
        zIndex: 1100,
        background: "#080f1e",
        border: `1px solid ${c}66`,
        borderRadius: 4,
        padding: 16,
        boxShadow: `0 0 24px ${c}22`,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 2,
                background: "#f59e0b22",
                border: "1px solid #f59e0b44",
                color: "#f59e0b",
              }}
            >
              OSINT
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 2,
                background: "#1e3a5f",
                border: "1px solid #1a2d45",
                color: "#64748b",
              }}
            >
              链 {event.relatedChain}
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 2,
                background: "#0d1a2e",
                color: "#334155",
              }}
            >
              {srcLabel}
            </span>
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#e2e8f0",
              lineHeight: 1.3,
            }}
          >
            {event.title}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            fontSize: 16,
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#94a3b8",
          lineHeight: 1.6,
          marginBottom: 10,
        }}
      >
        {event.content}
      </div>
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 9, color: "#64748b" }}>LLM 综合置信度</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: c,
              fontFamily: "var(--font-display)",
            }}
          >
            {(event.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div style={{ height: 3, background: "#0d1a2e", borderRadius: 2 }}>
          <div
            style={{
              width: `${event.confidence * 100}%`,
              height: "100%",
              background: c,
              borderRadius: 2,
              transition: "width 0.4s",
            }}
          />
        </div>
      </div>
      <div
        style={{
          padding: "8px 10px",
          background: "#0d1a2e",
          borderRadius: 3,
          fontSize: 9,
          color: "#64748b",
          lineHeight: 1.6,
          marginBottom: 10,
          borderLeft: `2px solid ${c}44`,
        }}
      >
        <span style={{ color: "#334155" }}>AI 分析：</span>
        {event.llmAnalysis}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 9,
          color: "#334155",
        }}
      >
        <span>{event.source}</span>
        <span>{event.date ?? event.time ?? "--"}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SiteMap
// ══════════════════════════════════════════════════════════════
function SiteMap({
  sites,
  selectedId,
  onSelect,
  osintEvents,
  newsMarkers,
  onOsintSelect,
  theaterCamera,
  layers,
  activeImgTime,
  activeNumericId,
}) {
  const sitesRef = useRef(sites);
  const newsRef = useRef(newsMarkers);
  const osintRef = useRef(osintEvents);
  useEffect(() => {
    sitesRef.current = sites;
  }, [sites]);
  useEffect(() => {
    newsRef.current = newsMarkers;
  }, [newsMarkers]);
  useEffect(() => {
    osintRef.current = osintEvents;
  }, [osintEvents]);

  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const cesiumRef = useRef(null);
  const handlerRef = useRef(null);
  const layerRefsRef = useRef({
    base: null,
    cia: null,
    combat: null,
    satellite: null,
  });

  const [selectedNews, setSelectedNews] = useState(null);
  const [pts, setPts] = useState({ sites: [], news: [], osint: [] });
  const baseMapUrl = useMemo(getBaseMapUrl, []);

  // ── Cesium 初始化 ─────────────────────────────────────────
  useEffect(() => {
    let destroyed = false;
    async function init() {
      if (!containerRef.current || viewerRef.current) return;
      const Cesium = await import("cesium");
      if (destroyed) return;
      cesiumRef.current = Cesium;

      const {
        Viewer,
        UrlTemplateImageryProvider,
        GeographicTilingScheme,
        WebMercatorTilingScheme,
        Ellipsoid,
        EllipsoidTerrainProvider,
        Color,
        Cartesian3,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        defined,
        Rectangle,
      } = Cesium;

      const viewer = new Viewer(containerRef.current, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
        navigationInstructionsInitiallyVisible: false,
        terrainProvider: new EllipsoidTerrainProvider(),
        shouldAnimate: true,
      });
      viewerRef.current = viewer;
      if (viewer.cesiumWidget.creditContainer)
        viewer.cesiumWidget.creditContainer.style.display = "none";

      viewer.imageryLayers.removeAll();

      const baseProvider = new UrlTemplateImageryProvider({
        url: baseMapUrl,
        tilingScheme: new GeographicTilingScheme({
          ellipsoid: Ellipsoid.WGS84,
        }),
        minimumLevel: 0,
        maximumLevel: 18,
        enablePickFeatures: false,
      });
      baseProvider.errorEvent.addEventListener((e) =>
        console.error("[worldmap]", e),
      );
      const baseLayer = viewer.imageryLayers.addImageryProvider(baseProvider);
      baseLayer.show = false;
      layerRefsRef.current.base = baseLayer;

      const ciaProvider = new UrlTemplateImageryProvider({
        url: getTiandituUrl(),
        tilingScheme: new WebMercatorTilingScheme(),
        minimumLevel: 0,
        maximumLevel: 18,
        enablePickFeatures: false,
      });
      const ciaLayer = viewer.imageryLayers.addImageryProvider(ciaProvider);
      ciaLayer.show = false;
      layerRefsRef.current.cia = ciaLayer;

      const combatProvider = new UrlTemplateImageryProvider({
        url: COMBAT_MAP_URL,
        subdomains: ["a", "b", "c", "d"],
        minimumLevel: 0,
        maximumLevel: 19,
        enablePickFeatures: false,
      });
      const combatLayer =
        viewer.imageryLayers.addImageryProvider(combatProvider);
      combatLayer.show = true;
      layerRefsRef.current.combat = combatLayer;

      layerRefsRef.current.satellite = null;

      // ── 卫星影像加载（直接访问真实 IP，自动探测层级）──────
      viewer.__loadSatelliteLayer__ = async (numericId, timeStr, lat, lng) => {
        const lr = layerRefsRef.current;
        if (lr.satellite) {
          viewer.imageryLayers.remove(lr.satellite, true);
          lr.satellite = null;
          console.log("[satellite] 旧图层已移除");
        }
        if (!numericId || !timeStr || lat == null || lng == null) {
          console.log("[satellite] 参数不完整，跳过", {
            numericId,
            timeStr,
            lat,
            lng,
          });
          return;
        }
        console.log("[satellite] 开始加载", {
          numericId,
          timeStr,
          lat,
          lng,
          SAT_BASE,
        });

        // 探测有效层级
        let validZoom = null;
        for (let z = 10; z <= 15; z++) {
          const { x, y } = lngLatToTile(lng, lat, z);
          const testUrl = getSatProbeUrl(numericId, timeStr, z, x, y);
          console.log(`[satellite] 探测 z=${z} x=${x} y=${y} → ${testUrl}`);
          try {
            const res = await fetch(testUrl);
            const ct = res.headers.get("content-type") ?? "";
            console.log(
              `[satellite] z=${z} → status=${res.status} content-type=${ct}`,
            );
            if (res.ok && ct.includes("image")) {
              validZoom = z;
              console.log(`[satellite] ✅ 有效层级 z=${z}`);
              break;
            }
          } catch (e) {
            console.warn(`[satellite] z=${z} 请求异常:`, e.message);
          }
        }

        if (validZoom === null) {
          console.warn(
            "[satellite] ❌ 未找到有效层级 pointId:",
            numericId,
            "time:",
            timeStr,
          );
          return;
        }

        const delta = 0.06;
        const rectangle = Rectangle.fromDegrees(
          Math.max(lng - delta, -180),
          Math.max(lat - delta, -90),
          Math.min(lng + delta, 180),
          Math.min(lat + delta, 90),
        );
        console.log("[satellite] rectangle ±0.06°:", {
          w: lng - delta,
          s: lat - delta,
          e: lng + delta,
          n: lat + delta,
        });

        const { GeographicTilingScheme, Ellipsoid } = cesiumRef.current;
        const satProvider = new UrlTemplateImageryProvider({
          url: getSatUrl(numericId, timeStr),
          tilingScheme: new GeographicTilingScheme({
            ellipsoid: Ellipsoid.WGS84,
          }),
          minimumLevel: validZoom,
          maximumLevel: validZoom + 2,
          enablePickFeatures: false,
          rectangle,
        });
        satProvider.errorEvent.addEventListener((e) =>
          console.warn("[satellite] tile err:", e),
        );
        const satLayer = viewer.imageryLayers.addImageryProvider(satProvider);
        satLayer.alpha = 1;
        lr.satellite = satLayer;
        console.log(
          "[satellite] ✅ 图层已添加，总图层数:",
          viewer.imageryLayers.length,
        );

        const zoomToHeight = {
          10: 80000,
          11: 40000,
          12: 20000,
          13: 10000,
          14: 5000,
          15: 2500,
        };
        // const flyHeight = zoomToHeight[validZoom] ?? 40000;
        const flyHeight = 15000; // 固定高度，避免过度放大导致图像模糊
        console.log(
          `[satellite] flyTo lng=${lng} lat=${lat} height=${flyHeight}`,
        );
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(lng, lat, flyHeight),
          duration: 1.5,
        });
      };

      Object.assign(viewer.scene, { fxaa: true });
      viewer.scene.skyBox.show =
        viewer.scene.moon.show =
        viewer.scene.sun.show =
          false;
      viewer.scene.backgroundColor = viewer.scene.globe.baseColor =
        Color.fromCssColorString("#040810");
      viewer.scene.globe.enableLighting = false;
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(
          theaterCamera.lng,
          theaterCamera.lat,
          theaterCamera.alt,
        ),
        duration: 0,
      });

      const updateOverlays = () => {
        if (!viewerRef.current || !cesiumRef.current) return;
        const {
          Cartesian3: C3,
          SceneTransforms,
          EllipsoidalOccluder,
          defined: def,
        } = cesiumRef.current;
        const occluder = new EllipsoidalOccluder(
          viewer.scene.globe.ellipsoid,
          viewer.camera.positionWC,
        );
        const project =
          SceneTransforms.worldToWindowCoordinates ??
          SceneTransforms.wgs84ToWindowCoordinates;
        const canvas = viewer.scene.canvas;
        const projectItem = (item) => {
          const coord = normCoord(item);
          if (!coord) return null;
          const cart = C3.fromDegrees(coord.lng, coord.lat, 0);
          if (!occluder.isPointVisible(cart)) return null;
          const wp = project(viewer.scene, cart);
          if (!def(wp)) return null;
          if (
            wp.x < -80 ||
            wp.x > canvas.clientWidth + 80 ||
            wp.y < -80 ||
            wp.y > canvas.clientHeight + 80
          )
            return null;
          return { ...item, x: wp.x, y: wp.y };
        };
        setPts({
          sites: sitesRef.current.map(projectItem).filter(Boolean),
          news: newsRef.current.map(projectItem).filter(Boolean),
          osint: osintRef.current.map(projectItem).filter(Boolean),
        });
      };
      viewer.__updateOverlays__ = updateOverlays;
      viewer.scene.postRender.addEventListener(updateOverlays);

      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((mv) => {
        if (!defined(viewer.scene.pick(mv.position))) {
          onOsintSelect(null);
          setSelectedNews(null);
        }
      }, ScreenSpaceEventType.LEFT_CLICK);
      handlerRef.current = handler;
      updateOverlays();
    }
    init();
    return () => {
      destroyed = true;
      handlerRef.current?.destroy();
      handlerRef.current = null;
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMapUrl]);

  useEffect(() => {
    if (!viewerRef.current || !cesiumRef.current) return;
    const { Cartesian3 } = cesiumRef.current;
    viewerRef.current.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        theaterCamera.lng,
        theaterCamera.lat,
        theaterCamera.alt,
      ),
      duration: 1.8,
    });
  }, [theaterCamera]);

  useEffect(() => {
    if (!viewerRef.current || !cesiumRef.current || !selectedId) return;
    const site = sitesRef.current.find((s) => s.id === selectedId);
    if (!site) return;
    const coord = normCoord(site);
    if (!coord) return;
    const { Cartesian3 } = cesiumRef.current;
    viewerRef.current.camera.flyTo({
      destination: Cartesian3.fromDegrees(coord.lng, coord.lat, 900000),
      duration: 1.2,
    });
    viewerRef.current.__updateOverlays__?.();
  }, [selectedId]);

  useEffect(() => {
    const lr = layerRefsRef.current;
    if (!lr.base || !lr.cia || !lr.combat) return;
    const isOwn = layers.basemap === "own";
    lr.base.show = isOwn;
    lr.cia.show = isOwn;
    lr.combat.show = !isOwn;
  }, [layers.basemap]);

  useEffect(() => {
    if (!viewerRef.current?.__loadSatelliteLayer__) return;
    if (layers.satellite && activeNumericId && activeImgTime) {
      const currentSite = sitesRef.current.find((s) => s.id === selectedId);
      console.log("[satellite] useEffect 触发", {
        activeNumericId,
        activeImgTime,
        site: currentSite
          ? { lat: currentSite.lat, lng: currentSite.lng }
          : null,
      });
      if (!currentSite?.lat || !currentSite?.lng) {
        console.warn("[satellite] 点位无经纬度，跳过");
        return;
      }
      viewerRef.current.__loadSatelliteLayer__(
        activeNumericId,
        activeImgTime,
        currentSite.lat,
        currentSite.lng,
      );
    } else {
      viewerRef.current.__loadSatelliteLayer__(null, null, null, null);
    }
  }, [selectedId, activeNumericId, activeImgTime, layers.satellite]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 600,
        }}
      >
        {layers.sites &&
          pts.sites.map((site) => {
            const c = statusColor(site.status),
              sel = site.id === selectedId;
            return (
              <div
                key={site.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(site.id);
                  onOsintSelect(null);
                }}
                style={{
                  position: "absolute",
                  left: site.x,
                  top: site.y,
                  transform: "translate(-50%,-50%)",
                  pointerEvents: "auto",
                  cursor: "pointer",
                  zIndex: sel ? 30 : 20,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: sel ? 42 : 32,
                    height: sel ? 42 : 32,
                    transform: "translate(-50%,-50%)",
                    borderRadius: "50%",
                    border: `2px solid ${c}`,
                    opacity: 0.5,
                    animation: "sitePulse 1.8s ease-out infinite",
                  }}
                />
                <div
                  style={{
                    width: sel ? 28 : 24,
                    height: sel ? 28 : 24,
                    borderRadius: "50%",
                    background: `${c}33`,
                    border: `2px solid ${c}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    color: c,
                    fontFamily: "JetBrains Mono",
                    fontWeight: 700,
                    boxShadow: `0 0 ${sel ? 18 : 10}px ${c}${sel ? "aa" : "66"}`,
                    backdropFilter: "blur(2px)",
                    transition: "all 0.2s",
                  }}
                >
                  {site.aci}
                </div>
                {sel && (
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: -12,
                      transform: "translate(-50%,-100%)",
                      whiteSpace: "nowrap",
                      padding: "5px 8px",
                      borderRadius: 3,
                      background: "rgba(4,8,16,0.92)",
                      border: `1px solid ${c}66`,
                      color: "#e2e8f0",
                      fontSize: 10,
                      boxShadow: `0 0 12px ${c}22`,
                    }}
                  >
                    {site.name}
                  </div>
                )}
              </div>
            );
          })}
        {layers.news &&
          pts.news.map((item) => {
            const tc = TYPE_COLOR[item.type] ?? "#94a3b8";
            return (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNews(item);
                  onOsintSelect(null);
                }}
                style={{
                  position: "absolute",
                  left: item.x,
                  top: item.y,
                  transform: "translate(-50%,-50%)",
                  pointerEvents: "auto",
                  cursor: "pointer",
                  zIndex: 15,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: `${tc}22`,
                    border: `2px solid ${tc}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    boxShadow: `0 0 8px ${tc}88`,
                  }}
                >
                  📰
                </div>
              </div>
            );
          })}
        {layers.osint &&
          pts.osint.map((ev) => {
            const c = confColor(ev.confidence);
            return (
              <div
                key={ev.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onOsintSelect(ev);
                  setSelectedNews(null);
                }}
                style={{
                  position: "absolute",
                  left: ev.x,
                  top: ev.y,
                  transform: "translate(-50%,-50%)",
                  pointerEvents: "auto",
                  cursor: "pointer",
                  zIndex: 14,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: `${c}22`,
                    border: `1.5px dashed ${c}88`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                    color: c,
                    fontFamily: "JetBrains Mono",
                    fontWeight: 700,
                    boxShadow: `0 0 8px ${c}44`,
                  }}
                >
                  {Math.round(ev.confidence * 100)}
                </div>
              </div>
            );
          })}
      </div>
      <style>{`
        @keyframes sitePulse {
          0%  {transform:translate(-50%,-50%) scale(.82);opacity:.85;}
          70% {transform:translate(-50%,-50%) scale(1.38);opacity:0;}
          100%{transform:translate(-50%,-50%) scale(1.38);opacity:0;}
        }
        .cesium-widget,.cesium-widget canvas,.cesium-viewer,.cesium-viewer-cesiumWidgetContainer{width:100%;height:100%;}
        .cesium-widget canvas:focus{outline:none;}
        .cesium-viewer-bottom{display:none!important;}
      `}</style>
      <NewsModal news={selectedNews} onClose={() => setSelectedNews(null)} />
    </div>
  );
}

function Section({ label, right, children }) {
  return (
    <div
      style={{
        marginBottom: 14,
        paddingBottom: 14,
        borderBottom: "1px solid #1a2d45",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.1em" }}>
          {label}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SitePackage — 主组件
// ══════════════════════════════════════════════════════════════
export default function SitePackage() {
  const { siteId } = useParams();
  const navigate = useNavigate();

  const [theaterId, setTheaterId] = useState("iran");
  const [theaters, setTheaters] = useState([]);
  const [sites, setSites] = useState([]);
  const [siteDetail, setSiteDetail] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedOsint, setSelectedOsint] = useState(null);
  const [layers, setLayers] = useState({
    basemap: "combat",
    sites: true,
    news: true,
    osint: true,
    satellite: true,
  });
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);

  useEffect(() => {
    fetch("/api/theaters")
      .then((r) => r.json())
      .then(setTheaters)
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`/api/theaters/${theaterId}/sites`)
      .then((r) => r.json())
      .then((data) => {
        setSites(data);
        setSelectedId(data[0]?.id ?? null);
        setImgIdx(0);
        setSelectedOsint(null);
      })
      .catch(console.error);
  }, [theaterId]);

  useEffect(() => {
    if (!selectedId) return;
    setTimeline([]);
    fetch(`/api/sites/${selectedId}`)
      .then((r) => r.json())
      .then(setSiteDetail)
      .catch(console.error);
    fetch(`/api/sites/${selectedId}/timeline`)
      .then((r) => r.json())
      .then(setTimeline)
      .catch(console.error);
  }, [selectedId]);

  const FALLBACK_CAMERAS = {
    iran: { lng: 48, lat: 32, alt: 4200000 },
    japan: { lng: 136, lat: 36, alt: 2800000 },
  };
  const theater = theaters.find((t) => t.id === theaterId) ?? {
    camera: FALLBACK_CAMERAS[theaterId] ?? FALLBACK_CAMERAS.iran,
  };
  const newsMarkers = [];
  const osintEvents = [];
  const site = siteDetail;
  const color = scoreColor(site?.combatScore ?? 0);

  useEffect(() => {
    if (siteId) setSelectedId(siteId);
    setImgIdx(0);
  }, [siteId]);

  const handleTheaterChange = useCallback((newId) => {
    setTheaterId(newId);
    setImgIdx(0);
    setSelectedOsint(null);
  }, []);
  const selectSite = (id) => {
    setSelectedId(id);
    setImgIdx(0);
    setSelectedOsint(null);
  };
  const handleMapClick = useCallback(() => setLayerPanelOpen(false), []);

  const activeImgItems = timeline.length > 0 ? timeline : (site?.imagery ?? []);
  const activeImg = activeImgItems[imgIdx] ?? activeImgItems[0] ?? {};
  const activeImgDate = activeImg.create_time
    ? activeImg.create_time.split(" ")[0]
    : (activeImg.date ?? "");
  const activeImgDesc = activeImg.desc ?? "—";
  const activeImgScore = activeImg.score ?? 0.85;
  const activeImgTime = activeImg.create_time
    ? activeImg.create_time.replace(" ", "T")
    : null;
  const activeNumericId = site?.numeric_id ?? site?.numericId ?? null;

  useEffect(() => {
    console.log("[SitePackage] 影像参数:", {
      selectedId,
      activeNumericId,
      activeImgTime,
      imgIdx,
    });
  }, [selectedId, activeNumericId, activeImgTime, imgIdx]);

  if (!site)
    return (
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        <BaseList
          sites={sites}
          selectedId={selectedId}
          onSelect={selectSite}
          theaterId={theaterId}
          onTheaterChange={handleTheaterChange}
          theaters={theaters}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#334155",
            fontSize: 12,
          }}
        >
          加载中...
        </div>
      </div>
    );

  const svTag =
    { S: "#ef4444", A: "#f59e0b" }[site.strategicValue] ?? "#22c55e";

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <BaseList
        sites={sites}
        selectedId={selectedId}
        onSelect={selectSite}
        theaterId={theaterId}
        onTheaterChange={handleTheaterChange}
        theaters={theaters}
      />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, position: "relative" }} onClick={handleMapClick}>
          <SiteMap
            sites={sites}
            selectedId={selectedId}
            onSelect={selectSite}
            osintEvents={osintEvents}
            newsMarkers={newsMarkers}
            onOsintSelect={(ev) => setSelectedOsint(ev)}
            theaterCamera={theater.camera}
            layers={layers}
            activeImgTime={activeImgTime}
            activeNumericId={activeNumericId}
          />
          <OsintCard
            event={selectedOsint}
            onClose={() => setSelectedOsint(null)}
          />

          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 1000,
              background: "rgba(4,8,16,0.88)",
              border: "1px solid #1a2d45",
              padding: "10px 14px",
              borderRadius: 4,
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: "1px solid #0d1a2e",
              }}
            >
              <span style={{ fontSize: 14 }}>{theater.flag}</span>
              <div>
                <div
                  style={{
                    fontSize: 8,
                    color: "#0ea5e9",
                    letterSpacing: "0.12em",
                  }}
                >
                  ACTIVE THEATER
                </div>
                <div style={{ fontSize: 9, color: "#e2e8f0", fontWeight: 600 }}>
                  {theater.labelEn}
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#64748b",
                marginBottom: 6,
                letterSpacing: "0.1em",
              }}
            >
              基地状态
            </div>
            {[
              ["#22c55e", "运行中"],
              ["#f59e0b", "受损"],
              ["#ef4444", "被摧毁"],
            ].map(([c, l]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 3,
                  fontSize: 10,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: c,
                  }}
                />
                <span style={{ color: c }}>{l}</span>
              </div>
            ))}
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid #0d1a2e",
                fontSize: 8,
                color: "#334155",
                letterSpacing: "0.06em",
              }}
            >
              {layers.basemap === "own"
                ? "🛰 自有底图 + 路网"
                : "🗺 作战绘制图层"}
            </div>
          </div>

          <div
            style={{ position: "absolute", bottom: 84, left: 12, zIndex: 1100 }}
            onClick={(e) => e.stopPropagation()}
          >
            {layerPanelOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: 0,
                }}
              >
                <LayerPanel layers={layers} onLayersChange={setLayers} />
              </div>
            )}
            <LayerToggleButton
              open={layerPanelOpen}
              onClick={() => setLayerPanelOpen((o) => !o)}
              layers={layers}
            />
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              background: "rgba(4,8,16,0.9)",
              borderTop: "1px solid #1a2d45",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "#64748b",
                letterSpacing: "0.1em",
                flexShrink: 0,
              }}
            >
              影像时间轴
            </div>
            <div
              style={{ display: "flex", gap: 8, flex: 1, overflowX: "auto" }}
            >
              {activeImgItems.map((item, i) => {
                const itemDate = item.create_time
                  ? item.create_time.split(" ")[0]
                  : item.date;
                const itemLabel = item.label ?? `影像 #${item.image_id}`;
                return (
                  <div
                    key={item.id ?? i}
                    onClick={() => setImgIdx(i)}
                    style={{
                      flexShrink: 0,
                      padding: "8px 14px",
                      borderRadius: 3,
                      cursor: "pointer",
                      background: imgIdx === i ? `${color}22` : "#080f1e",
                      border: `1px solid ${imgIdx === i ? color : "#1a2d45"}`,
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: imgIdx === i ? color : "#94a3b8",
                      }}
                    >
                      {itemDate}
                    </div>
                    <div
                      style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}
                    >
                      {itemLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          style={{
            width: 340,
            flexShrink: 0,
            background: "#040810",
            borderLeft: "1px solid #1a2d45",
            overflowY: "auto",
            padding: 16,
          }}
        >
          <div
            style={{
              marginBottom: 14,
              paddingBottom: 14,
              borderBottom: "1px solid #1a2d45",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#64748b",
                  letterSpacing: "0.1em",
                }}
              >
                {site.country} · {site.type}
              </div>
              <div
                style={{
                  padding: "2px 8px",
                  borderRadius: 2,
                  fontSize: 10,
                  fontWeight: 700,
                  background: `${svTag}22`,
                  border: `1px solid ${svTag}`,
                  color: svTag,
                }}
              >
                {site.strategicValue} 级
              </div>
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#e2e8f0",
                marginBottom: 10,
              }}
            >
              {site.name}
            </div>
            <DamageStatus status={site.status} />
          </div>
          <DualScore aci={site.aci} dci={site.dci} />
          <Section label="能力趋势（7日）">
            <DualTrendChart dailyData={site.dailyData} />
          </Section>
          <Section label="综合能力评估">
            <div style={{ display: "flex", justifyContent: "center" }}>
              <RadarChart site={site} />
            </div>
          </Section>
          <Section
            label="点位影像"
            right={
              <span style={{ fontSize: 10, color: statusColor(site.status) }}>
                验证置信度 {(activeImgScore * 100).toFixed(0)}%
              </span>
            }
          >
            <div
              style={{
                width: "100%",
                height: 140,
                borderRadius: 4,
                background:
                  "linear-gradient(135deg,#0d1a2e 0%,#1a2d45 50%,#0d1a2e 100%)",
                border: "1px solid #1a2d45",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{ fontSize: 10, color: "#334155", textAlign: "center" }}
              >
                <div style={{ fontSize: 20, marginBottom: 4, opacity: 0.3 }}>
                  ◉
                </div>
                <div>WMTS 影像加载点</div>
                <div style={{ fontSize: 9, marginTop: 2, color: "#1a2d45" }}>
                  {site.name}
                </div>
                <div style={{ fontSize: 9, color: "#1a2d45" }}>
                  {activeImgDate}
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(to right,transparent,${statusColor(site.status)}88,transparent)`,
                  animation: "scanline 3s linear infinite",
                }}
              />
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 10,
                color: "#94a3b8",
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: "#64748b" }}>识别结果：</span>
              {activeImgDesc}
            </div>
          </Section>
          <Section label="设施损毁评估">
            <FacilitiesList facilities={site.facilities} />
          </Section>
          <RelatedEvents
            siteId={site.id}
            onNavigate={() => navigate("/chain")}
          />
        </div>
      </div>
      <style>{`@keyframes scanline{0%{top:0}100%{top:100%}}`}</style>
    </div>
  );
}
