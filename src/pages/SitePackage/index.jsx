import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { SITES, EVENTS, NEWS_MARKERS, OSINT_EVENTS } from "../../data/mockData";

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

// ── 天地图路网 ─────────────────────────────────────────────────
const TIANDITU_TOKEN = "2bac672b2cdbc6986edde89f55058e28"; // 与第二份代码保持一致
const getTiandituUrl = () =>
  `/tianditu-proxy/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_TOKEN}`;
// ── 底图 URL ─────────────────────────────────────────────────
const getBaseMapUrl = () =>
  window.__USE_BASEMAP_PROXY__
    ? "/worldmap/getdata?x={x}&y={y}&l={z}"
    : `http://${window.BASE_MAP_ADDRESS ?? import.meta.env?.VITE_BASE_MAP_ADDRESS ?? "124.70.78.85"}:${window.BASE_MAP_PORT ?? import.meta.env?.VITE_BASE_MAP_PORT ?? "9998"}/getdata?x={x}&y={y}&l={z}`;

// ── 经纬度标准化（兼容 lng/lon/longitude, lat/latitude） ──────
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

// ── BaseList ─────────────────────────────────────────────────
function BaseList({ sites, selectedId, onSelect }) {
  const [filter, setFilter] = useState("all");
  const FILTERS = [
    ["all", "全部"],
    ["operational", "运行中"],
    ["damaged", "受损"],
    ["destroyed", "被摧毁"],
  ];
  const visible =
    filter === "all" ? sites : sites.filter((s) => s.status === filter);

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
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1a2d45" }}>
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
          const sc = statusColor(site.status);
          const sel = site.id === selectedId;
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
          ◈ {OSINT_EVENTS.length} 条开源情报待验证
        </span>
      </div>
    </div>
  );
}

// ── RadarChart ───────────────────────────────────────────────
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

// ── DualScore ────────────────────────────────────────────────
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

// ── DualTrendChart ───────────────────────────────────────────
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

// ── DamageStatus ─────────────────────────────────────────────
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

// ── FacilitiesList ───────────────────────────────────────────
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

// ── RelatedEvents ────────────────────────────────────────────
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

// ── NewsModal ────────────────────────────────────────────────
function NewsModal({ news, onClose }) {
  if (!news) return null;
  const tc = TYPE_COLOR[news.type] ?? "#94a3b8";
  const tl = TYPE_LABEL[news.type] ?? "信息";
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

// ── OsintCard ────────────────────────────────────────────────
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

// ── SiteMap (Cesium) ─────────────────────────────────────────
function SiteMap({ sites, selectedId, onSelect, osintEvents, onOsintSelect }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const cesiumRef = useRef(null);
  const handlerRef = useRef(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [pts, setPts] = useState({ sites: [], news: [], osint: [] });

  const baseMapUrl = useMemo(getBaseMapUrl, []);

  // Cesium 初始化
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
        Ellipsoid,
        EllipsoidTerrainProvider,
        Color,
        Cartesian3,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        defined,
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

      // 底图
      viewer.imageryLayers.removeAll();
      const provider = new UrlTemplateImageryProvider({
        url: baseMapUrl,
        tilingScheme: new GeographicTilingScheme({
          ellipsoid: Ellipsoid.WGS84,
        }),
        minimumLevel: 0,
        maximumLevel: 18,
        enablePickFeatures: false,
      });
      provider.errorEvent.addEventListener((e) =>
        console.error("[worldmap]", e),
      );
      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.alpha = layer.brightness = layer.contrast = 1;

      // 天地图路网叠加层（vec_w，WGS84 墨卡托）
      const tiandituProvider = new UrlTemplateImageryProvider({
        url: getTiandituUrl(),
        subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"],
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        minimumLevel: 0,
        maximumLevel: 18,
        enablePickFeatures: false,
      });
      const streetLayer =
        viewer.imageryLayers.addImageryProvider(tiandituProvider);
      streetLayer.alpha = 1;
      streetLayer.brightness = 1;
      streetLayer.contrast = 1;

      // 场景风格
      Object.assign(viewer.scene, { fxaa: true });
      viewer.scene.skyBox.show =
        viewer.scene.moon.show =
        viewer.scene.sun.show =
          false;
      viewer.scene.backgroundColor = viewer.scene.globe.baseColor =
        Color.fromCssColorString("#040810");
      viewer.scene.globe.enableLighting = false;
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(48, 32, 4200000),
        duration: 0,
      });

      // overlay 更新（每帧投影点位到屏幕坐标）
      const updateOverlays = () => {
        if (!viewerRef.current || !cesiumRef.current) return;
        const { Cartesian3, SceneTransforms, EllipsoidalOccluder, defined } =
          cesiumRef.current;
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
          const cart = Cartesian3.fromDegrees(coord.lng, coord.lat, 0);
          if (!occluder.isPointVisible(cart)) return null;
          const wp = project(viewer.scene, cart);
          if (!defined(wp)) return null;
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
          sites: sites.map(projectItem).filter(Boolean),
          news: NEWS_MARKERS.map(projectItem).filter(Boolean),
          osint: osintEvents.map(projectItem).filter(Boolean),
        });
      };

      viewer.__updateOverlays__ = updateOverlays;
      viewer.scene.postRender.addEventListener(updateOverlays);

      // 点击空白关闭
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

  // 选中基地时飞行
  useEffect(() => {
    if (!viewerRef.current || !cesiumRef.current || !selectedId) return;
    const site = sites.find((s) => s.id === selectedId);
    if (!site) return;
    const coord = normCoord(site);
    if (!coord) return;
    const { Cartesian3 } = cesiumRef.current;
    viewerRef.current.camera.flyTo({
      destination: Cartesian3.fromDegrees(coord.lng, coord.lat, 900000),
      duration: 1.2,
    });
    viewerRef.current.__updateOverlays__?.();
  }, [selectedId, sites]);

  // 数据变化时刷新 overlay
  useEffect(() => {
    viewerRef.current?.__updateOverlays__?.();
  }, [sites, osintEvents, selectedId]);

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

      {/* DOM overlay 层 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 600,
        }}
      >
        {/* 基地标记 */}
        {pts.sites.map((site) => {
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

        {/* 新闻标记 */}
        {pts.news.map((item) => {
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

        {/* OSINT 标记 */}
        {pts.osint.map((ev) => {
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
          0%  { transform:translate(-50%,-50%) scale(.82); opacity:.85; }
          70% { transform:translate(-50%,-50%) scale(1.38); opacity:0; }
          100%{ transform:translate(-50%,-50%) scale(1.38); opacity:0; }
        }
        .cesium-widget,.cesium-widget canvas,.cesium-viewer,.cesium-viewer-cesiumWidgetContainer { width:100%;height:100%; }
        .cesium-widget canvas:focus { outline:none; }
        .cesium-viewer-bottom { display:none !important; }
      `}</style>

      <NewsModal news={selectedNews} onClose={() => setSelectedNews(null)} />
    </div>
  );
}

// ── SitePackage（主组件） ─────────────────────────────────────
export default function SitePackage() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(siteId ?? SITES[0].id);
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedOsint, setSelectedOsint] = useState(null);

  const site = SITES.find((s) => s.id === selectedId) ?? SITES[0];
  const color = scoreColor(site.combatScore);

  useEffect(() => {
    if (siteId) setSelectedId(siteId);
    setImgIdx(0);
  }, [siteId]);

  const selectSite = (id) => {
    setSelectedId(id);
    setImgIdx(0);
    setSelectedOsint(null);
  };
  const svTag =
    { S: "#ef4444", A: "#f59e0b" }[site.strategicValue] ?? "#22c55e";

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <BaseList sites={SITES} selectedId={selectedId} onSelect={selectSite} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* 地图区 */}
        <div style={{ flex: 1, position: "relative" }}>
          <SiteMap
            sites={SITES}
            selectedId={selectedId}
            onSelect={selectSite}
            osintEvents={OSINT_EVENTS}
            onOsintSelect={(ev) => setSelectedOsint(ev)}
          />
          <OsintCard
            event={selectedOsint}
            onClose={() => setSelectedOsint(null)}
          />

          {/* 图例 */}
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
          </div>

          {/* 时间轴 */}
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
              {site.imagery.map((img, i) => (
                <div
                  key={i}
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
                    {img.date}
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>
                    {img.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧详情 */}
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
          {/* 头部 */}
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

          {/* 点位影像 */}
          <Section
            label="点位影像"
            right={
              <span style={{ fontSize: 10, color: statusColor(site.status) }}>
                验证置信度 {(site.imagery[imgIdx]?.score * 100).toFixed(0)}%
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
                  {site.imagery[imgIdx]?.date}
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
              {site.imagery[imgIdx]?.desc}
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

// ── Section 容器（消除重复的 borderBottom 区块样式） ──────────
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
