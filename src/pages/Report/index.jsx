import { useState, useEffect, useRef, useCallback, memo } from "react";
import { REPORT, SITE_EVENTS } from "../../data/mockData";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Viewer,
  Ion,
  Cartesian3,
  Color,
  Math as CesiumMath,
  UrlTemplateImageryProvider,
  EllipsoidTerrainProvider,
  createWorldTerrainAsync,
  createOsmBuildingsAsync,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  WebMercatorTilingScheme,
  GeographicTilingScheme,
  Ellipsoid,
} from "cesium";

const TIANDITU_TOKEN = "2bac672b2cdbc6986edde89f55058e28";

const getBaseMapUrl = () =>
  window.__USE_BASEMAP_PROXY__
    ? "/worldmap/getdata?x={x}&y={y}&l={z}"
    : `http://${window.BASE_MAP_ADDRESS ?? import.meta.env?.VITE_BASE_MAP_ADDRESS ?? "124.70.78.85"}:${
        window.BASE_MAP_PORT ?? import.meta.env?.VITE_BASE_MAP_PORT ?? "9998"
      }/getdata?x={x}&y={y}&l={z}`;

const LEAFLET_CIA_URL = `/tianditu-proxy/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_TOKEN}`;

// ── 颜色工具 ──────────────────────────────────────────────────
function confColor(c) {
  if (c >= 0.85) return "#22c55e";
  if (c >= 0.65) return "#f59e0b";
  if (c >= 0.45) return "#f97316";
  return "#ef4444";
}
function levelColor(level) {
  if (level === "high") return "#ef4444";
  if (level === "medium") return "#f59e0b";
  return "#0ea5e9";
}

// ── StreamText ────────────────────────────────────────────────
function StreamText({ text, speed = 18, onComplete }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    idx.current = 0;
    completedRef.current = false;
    setDisplayed("");
    const timer = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.slice(0, idx.current + 1));
        idx.current++;
        if (idx.current >= text.length && !completedRef.current) {
          completedRef.current = true;
          clearInterval(timer);
          onCompleteRef.current?.();
        }
      } else clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span
          style={{
            animation: "blink 0.8s step-end infinite",
            color: "#f59e0b",
          }}
        >
          ▋
        </span>
      )}
    </span>
  );
}

// ── FadeBlock ─────────────────────────────────────────────────
function FadeBlock({ show, delay = 0, children }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timer;
    if (show) timer = setTimeout(() => setVisible(true), delay);
    else setVisible(false);
    return () => clearTimeout(timer);
  }, [show, delay]);
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
      }}
    >
      {children}
    </div>
  );
}

// ── SiteEventCard ─────────────────────────────────────────────
function SiteEventCard({
  siteKey,
  anchor,
  onClose,
  onSelectEvent,
  selectedEvent,
  containerWidth,
}) {
  const siteData = SITE_EVENTS[siteKey];
  if (!siteData) return null;
  const cardWidth = 256,
    margin = 12;
  let left = anchor.x + 16;
  if (left + cardWidth > containerWidth - margin)
    left = anchor.x - cardWidth - 8;
  const top = Math.max(anchor.y - 20, 10);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: cardWidth,
        background: "rgba(4,8,16,0.97)",
        border: "1px solid #1e3a5f",
        borderRadius: 6,
        padding: 10,
        zIndex: 50,
        boxShadow: "0 4px 32px rgba(0,0,0,0.5),0 0 0 1px rgba(14,165,233,0.12)",
        backdropFilter: "blur(8px)",
        animation: "fadeInCard 0.18s ease",
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
        <div
          style={{
            fontSize: 10,
            color: "#e2e8f0",
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {siteData.title}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
        >
          ×
        </button>
      </div>
      <div
        style={{
          fontSize: 9,
          color: "#334155",
          letterSpacing: "0.1em",
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        Related Events · 关联事件
      </div>
      {siteData.events.map((event) => {
        const isSel = selectedEvent?.id === event.id;
        return (
          <div
            key={event.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectEvent(event);
            }}
            style={{
              padding: 8,
              marginBottom: 6,
              background: isSel ? "#0b1628" : "#070d1a",
              border: `1px solid ${isSel ? "#0ea5e9" : "#1a2d45"}`,
              borderRadius: 4,
              cursor: "pointer",
              transition: "all 0.18s",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              if (!isSel) {
                e.currentTarget.style.background = "#0a1220";
                e.currentTarget.style.borderColor = "#1e3a5f";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSel) {
                e.currentTarget.style.background = "#070d1a";
                e.currentTarget.style.borderColor = "#1a2d45";
              }
            }}
          >
            {isSel && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "#0ea5e9",
                  borderRadius: "2px 0 0 2px",
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: isSel ? "#e2e8f0" : "#cbd5e1",
                  flex: 1,
                  paddingRight: 6,
                  lineHeight: 1.4,
                }}
              >
                {event.title}
              </div>
              <span
                style={{
                  fontSize: 8,
                  color: levelColor(event.level),
                  border: `1px solid ${levelColor(event.level)}55`,
                  borderRadius: 8,
                  padding: "1px 6px",
                  flexShrink: 0,
                }}
              >
                {event.level === "high"
                  ? "高"
                  : event.level === "medium"
                    ? "中"
                    : "低"}
              </span>
            </div>
            <div style={{ fontSize: 9, color: "#475569" }}>{event.time}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── EventDetailPanel ──────────────────────────────────────────
function EventDetailPanel({ event, onClose }) {
  if (!event) return null;
  return (
    <FadeBlock show={!!event}>
      <div
        style={{
          background: "#0b1220",
          border: "1px solid #0ea5e9",
          borderRadius: 4,
          padding: 14,
          marginBottom: 16,
          boxShadow: "0 0 18px rgba(14,165,233,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#0ea5e9",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Event Detail · 事件详情
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: 14,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
          >
            ×
          </button>
        </div>
        <div
          style={{
            height: 2,
            background: `${levelColor(event.level)}33`,
            borderRadius: 1,
            marginBottom: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width:
                event.level === "high"
                  ? "80%"
                  : event.level === "medium"
                    ? "50%"
                    : "25%",
              height: "100%",
              background: levelColor(event.level),
              transition: "width 0.6s",
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#e2e8f0",
            fontWeight: 700,
            marginBottom: 6,
            lineHeight: 1.4,
          }}
        >
          {event.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 9, color: "#64748b" }}>{event.time}</div>
          <span
            style={{
              fontSize: 8,
              color: levelColor(event.level),
              border: `1px solid ${levelColor(event.level)}55`,
              borderRadius: 8,
              padding: "1px 6px",
            }}
          >
            {event.level === "high"
              ? "高风险"
              : event.level === "medium"
                ? "中风险"
                : "低风险"}
          </span>
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#94a3b8",
            lineHeight: 1.75,
            marginBottom: 10,
          }}
        >
          {event.summary}
        </div>
        <div
          style={{
            padding: 8,
            background: "#040810",
            borderRadius: 4,
            border: "1px solid #1a2d45",
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "#22c55e" }}>📡 来源：</span>
            <span style={{ fontSize: 9, color: "#64748b" }}>
              {event.source}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 9, color: "#f59e0b" }}>💡 建议：</span>
            <span style={{ fontSize: 9, color: "#64748b" }}>
              {event.suggestion}
            </span>
          </div>
        </div>
      </div>
    </FadeBlock>
  );
}

// ── TacticalDemo
// memo 隔离：只有 phase / viewMode / viewerId / onSelectSite 四个 props
// selectedSite 通过静态 ref 方法写入，完全不触发组件重渲染
// ─────────────────────────────────────────────────────────────
const TacticalDemo = memo(function TacticalDemo({
  phase,
  viewMode,
  viewerId,
  onSelectSite,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const hitOverlayRef = useRef(null);
  const cesiumContainerRef = useRef(null);
  const leafletContainerRef = useRef(null);
  const viewerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const animRef = useRef(null);
  const selectedSiteRef = useRef(null); // ← 不走 state，避免重渲染
  const pointHitMapRef = useRef([]);
  const phaseRef = useRef(phase);
  const viewModeRef = useRef(viewMode);
  const [viewport, setViewport] = useState({ width: 900, height: 520 });
  const [, tickLeaflet] = useState(0); // 仅用于 Leaflet move/zoom 触发 canvas 重算

  // 同步 ref
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // 自适应尺寸
  useEffect(() => {
    if (!wrapRef.current) return;
    const update = () => {
      const r = wrapRef.current.getBoundingClientRect();
      setViewport({
        width: Math.max(300, Math.floor(r.width)),
        height: Math.max(240, Math.floor(r.height)),
      });
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [viewerId]);

  // ── Cesium 初始化（仅一次）────────────────────────────────
  useEffect(() => {
    let destroyed = false;
    async function init() {
      if (!cesiumContainerRef.current || viewerRef.current) return;
      const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
      if (ionToken) Ion.defaultAccessToken = ionToken;
      const viewer = new Viewer(cesiumContainerRef.current, {
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: false,
        fullscreenButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        baseLayerPicker: false,
        infoBox: false,
        selectionIndicator: false,
        shouldAnimate: true,
        requestRenderMode: false,
        imageryProvider: false,
        terrainProvider: new EllipsoidTerrainProvider(),
      });
      if (destroyed) {
        viewer.destroy();
        return;
      }
      viewerRef.current = viewer;

      viewer.imageryLayers.removeAll();
      const baseProvider = new UrlTemplateImageryProvider({
        url: getBaseMapUrl(),
        tilingScheme: new GeographicTilingScheme({
          ellipsoid: Ellipsoid.WGS84,
        }),
        minimumLevel: 0,
        maximumLevel: 18,
        enablePickFeatures: false,
      });
      viewer.imageryLayers.addImageryProvider(baseProvider);
      const ciaProvider = new UrlTemplateImageryProvider({
        url: `/tianditu-proxy/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_TOKEN}`,
        tilingScheme: new WebMercatorTilingScheme(),
        minimumLevel: 0,
        maximumLevel: 18,
        enablePickFeatures: false,
      });
      viewer.imageryLayers.addImageryProvider(ciaProvider);

      viewer.scene.globe.enableLighting = true;
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.fog.enabled = true;
      viewer.scene.globe.baseColor = Color.fromCssColorString("#050b14");
      viewer.scene.backgroundColor = Color.fromCssColorString("#040810");
      viewer.scene.moon.show = false;
      viewer.scene.sun.show = true;
      if (viewer.cesiumWidget?.creditContainer)
        viewer.cesiumWidget.creditContainer.style.display = "none";
      try {
        if (ionToken) {
          viewer.terrainProvider = await createWorldTerrainAsync();
          viewer.scene.primitives.add(await createOsmBuildingsAsync());
        }
      } catch (e) {
        console.warn("terrain/buildings:", e);
      }
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(44.2, 35.8, 1400000),
        orientation: {
          heading: CesiumMath.toRadians(0),
          pitch: CesiumMath.toRadians(-90),
          roll: 0,
        },
        duration: 0,
      });
    }
    init();
    return () => {
      destroyed = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId]);

  // ── Leaflet 初始化（切到 2D 时挂载）──────────────────────
  useEffect(() => {
    if (viewMode !== "2d") return;
    if (!leafletContainerRef.current || leafletMapRef.current) return;
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "",
      iconUrl: "",
      shadowUrl: "",
    });
    const map = L.map(leafletContainerRef.current, {
      center: [35.8, 44.2],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
    });
    leafletMapRef.current = map;
    L.tileLayer(getBaseMapUrl(), { maxZoom: 18 }).addTo(map);
    L.tileLayer(LEAFLET_CIA_URL, { maxZoom: 18 }).addTo(map);
    // 地图移动时只触发 canvas 重算，不重建任何地图实例
    map.on("move zoom", () => tickLeaflet((n) => n + 1));
    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [viewMode]);

  // Leaflet 尺寸同步
  useEffect(() => {
    if (viewMode === "2d")
      setTimeout(() => leafletMapRef.current?.invalidateSize(), 50);
  }, [viewMode, viewport]);

  // ── 3D 相机复位（切换 viewMode 时）──────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || viewMode !== "3d") return;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(44.2, 35.8, 1400000),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-90),
        roll: 0,
      },
      duration: 0.8,
    });
  }, [viewMode]);

  // ── 悬停光标 ─────────────────────────────────────────────
  useEffect(() => {
    if (viewMode === "2d") {
      const overlay = hitOverlayRef.current;
      if (!overlay) return;
      const fn = (e) => {
        const r = overlay.getBoundingClientRect();
        const x = e.clientX - r.left,
          y = e.clientY - r.top;
        overlay.style.cursor = pointHitMapRef.current.some(
          (p) => Math.hypot(x - p.x, y - p.y) <= p.r,
        )
          ? "pointer"
          : "grab";
      };
      overlay.addEventListener("mousemove", fn);
      overlay.style.cursor = "grab";
      return () => overlay.removeEventListener("mousemove", fn);
    }
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(({ endPosition: { x, y } }) => {
      viewer.scene.canvas.style.cursor = pointHitMapRef.current.some(
        (p) => Math.hypot(x - p.x, y - p.y) <= p.r,
      )
        ? "pointer"
        : "";
    }, ScreenSpaceEventType.MOUSE_MOVE);
    return () => {
      if (!handler.isDestroyed()) handler.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, viewerRef.current]);

  // ── 2D 点击 ───────────────────────────────────────────────
  useEffect(() => {
    const overlay = hitOverlayRef.current;
    if (!overlay || viewMode !== "2d") return;
    let downPos = { x: 0, y: 0 };
    const onDown = (e) => {
      downPos = { x: e.clientX, y: e.clientY };
    };
    const onClick = (e) => {
      if (
        Math.abs(e.clientX - downPos.x) > 6 ||
        Math.abs(e.clientY - downPos.y) > 6
      )
        return;
      const r = overlay.getBoundingClientRect();
      const x = e.clientX - r.left,
        y = e.clientY - r.top;
      let hit = null,
        minD = Infinity;
      pointHitMapRef.current.forEach((p) => {
        const d = Math.hypot(x - p.x, y - p.y);
        if (d <= p.r && d < minD) {
          hit = p;
          minD = d;
        }
      });
      e.stopPropagation();
      onSelectSite?.(hit ? hit.key : null, hit ? { x: hit.x, y: hit.y } : null);
    };
    overlay.addEventListener("pointerdown", onDown);
    overlay.addEventListener("click", onClick);
    return () => {
      overlay.removeEventListener("pointerdown", onDown);
      overlay.removeEventListener("click", onClick);
    };
  }, [onSelectSite, viewMode]);

  // ── 3D 点击 ───────────────────────────────────────────────
  useEffect(() => {
    if (viewMode !== "3d") return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(({ position: { x, y } }) => {
      let hit = null,
        minD = Infinity;
      pointHitMapRef.current.forEach((p) => {
        const d = Math.hypot(x - p.x, y - p.y);
        if (d <= p.r && d < minD) {
          hit = p;
          minD = d;
        }
      });
      onSelectSite?.(hit ? hit.key : null, hit ? { x: hit.x, y: hit.y } : null);
    }, ScreenSpaceEventType.LEFT_CLICK);
    return () => {
      if (!handler.isDestroyed()) handler.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, onSelectSite, viewerRef.current]);

  // ── 主绘制循环（仅 viewport 变化时重建，其余用 ref 读取）──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const SITES_DATA = [
      {
        lat: 36.679,
        lng: 42.447,
        label: "塔尔阿夫尔基地",
        color: "#f59e0b",
        type: "base",
        alt: 3000,
      },
      {
        lat: 35.1,
        lng: 43.9,
        label: "侦察前进基地",
        color: "#0ea5e9",
        type: "recon",
        alt: 2500,
      },
      {
        lat: 35.5,
        lng: 45.1,
        label: "胡拉玛目标区",
        color: "#ef4444",
        type: "target",
        alt: 1200,
      },
      {
        lat: 34.8,
        lng: 46.2,
        label: "设施B(预测)",
        color: "#8b5cf6",
        type: "predict",
        alt: 1200,
      },
    ];
    let t = 0;

    function getScreenPoint(lat, lng, alt = 0) {
      if (viewModeRef.current === "2d") {
        const map = leafletMapRef.current;
        if (!map) return null;
        const pt = map.latLngToContainerPoint(L.latLng(lat, lng));
        return { x: pt.x, y: pt.y };
      }
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return null;
      const cart = Cartesian3.fromDegrees(lng, lat, alt);
      const pos = viewer.scene.cartesianToCanvasCoordinates(cart);
      if (!pos || isNaN(pos.x) || isNaN(pos.y)) return null;
      if (
        pos.x < -120 ||
        pos.x > viewport.width + 120 ||
        pos.y < -120 ||
        pos.y > viewport.height + 120
      )
        return null;
      return { x: pos.x, y: pos.y };
    }

    function stroke3(text, x, y) {
      ctx.strokeStyle = "rgba(4,8,16,0.7)";
      ctx.lineWidth = 3;
      ctx.strokeText(text, x, y);
    }

    function drawSite(site, tick) {
      const p = getScreenPoint(site.lat, site.lng, site.alt);
      if (!p) return;
      const isActive = selectedSiteRef.current === site.type;
      const pulse = (Math.sin(tick * 0.05 + site.lat) + 1) / 2;
      pointHitMapRef.current.push({
        key: site.type,
        x: p.x,
        y: p.y,
        r: isActive ? 20 : 16,
      });

      ctx.beginPath();
      ctx.arc(
        p.x,
        p.y,
        isActive ? 12 + pulse * 14 : 8 + pulse * 10,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = isActive ? site.color + "99" : site.color + "44";
      ctx.lineWidth = isActive ? 1.6 : 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, isActive ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = site.color;
      ctx.fill();

      if (isActive) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10 + pulse * 4, 0, Math.PI * 2);
        ctx.strokeStyle = site.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.font = isActive ? "bold 10px JetBrains Mono" : "10px JetBrains Mono";
      stroke3(site.label, p.x + 10, p.y - 6);
      ctx.fillStyle = site.color;
      ctx.fillText(site.label, p.x + 10, p.y - 6);
      if (!isActive) {
        ctx.font = "8px JetBrains Mono";
        ctx.fillStyle = site.color + "88";
        ctx.fillText("▸", p.x + 10, p.y + 6);
      }
    }

    function drawFlightPath(
      from,
      to,
      progress,
      color,
      dashed = false,
      label = "",
      alt = 2500,
    ) {
      const a = getScreenPoint(from.lat, from.lng, alt),
        b = getScreenPoint(to.lat, to.lng, alt);
      if (!a || !b) return;
      const mx = a.x + (b.x - a.x) * progress,
        my = a.y + (b.y - a.y) * progress;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (dashed) ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(mx, my);
      ctx.stroke();
      ctx.restore();
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
      if (label) {
        const lx = a.x + (b.x - a.x) * 0.42,
          ly = a.y + (b.y - a.y) * 0.42 - 12;
        ctx.font = "10px JetBrains Mono";
        stroke3(label, lx, ly);
        ctx.fillStyle = color;
        ctx.fillText(label, lx, ly);
      }
    }

    function drawReconOrbit() {
      if (viewModeRef.current === "2d") {
        const c = getScreenPoint(35.1, 43.9, 0);
        if (!c) return;
        ctx.save();
        ctx.strokeStyle = "#0ea5e9";
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 20, 13, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.font = "10px JetBrains Mono";
        stroke3("侦察盘旋区域", c.x + 18, c.y + 6);
        ctx.fillStyle = "#0ea5e9";
        ctx.fillText("侦察盘旋区域", c.x + 18, c.y + 6);
        return;
      }
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const p = getScreenPoint(
          35.1 + Math.sin(a) * 0.2,
          43.9 + Math.cos(a) * 0.32,
          2200,
        );
        if (p) pts.push(p);
      }
      if (pts.length > 2) {
        ctx.save();
        ctx.strokeStyle = "#0ea5e9";
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.restore();
        const c = getScreenPoint(35.1, 43.9, 2200);
        if (c) {
          ctx.font = "10px JetBrains Mono";
          ctx.fillStyle = "#0ea5e9";
          ctx.fillText("侦察盘旋区域", c.x + 18, c.y + 6);
        }
      }
    }

    function drawStrike(tick) {
      const p = getScreenPoint(35.5, 45.1, 1500);
      if (!p) return;
      const blast = (Math.sin(tick * 0.15) + 1) / 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10 + blast * 18, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239,68,68,${0.12 + blast * 0.22})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.font = "bold 10px JetBrains Mono";
      stroke3("✕ 卫星影像确认打击", p.x + 12, p.y + 18);
      ctx.fillStyle = "#ef4444";
      ctx.fillText("✕ 卫星影像确认打击", p.x + 12, p.y + 18);
    }

    function drawPredictZone() {
      const p = getScreenPoint(34.8, 46.2, 1500);
      if (!p) return;
      ctx.save();
      ctx.strokeStyle = "#8b5cf6";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.font = "10px JetBrains Mono";
      stroke3("预测目标圈定", p.x + 12, p.y - 10);
      ctx.fillStyle = "#8b5cf6";
      ctx.fillText("预测目标圈定", p.x + 12, p.y - 10);
    }

    function drawHUD() {
      ctx.save();
      ctx.fillStyle = "rgba(4,8,16,0.88)";
      ctx.strokeStyle = "#1a2d45";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(viewport.width - 220, 14, 204, 92, 6);
      ctx.fill();
      ctx.stroke();
      ctx.font = "10px JetBrains Mono";
      ctx.fillStyle = "#64748b";
      ctx.fillText("VIEW", viewport.width - 206, 34);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(
        viewModeRef.current === "3d" ? "CESIUM 3D" : "LEAFLET 2D",
        viewport.width - 160,
        34,
      );
      ctx.fillStyle = "#64748b";
      ctx.fillText("ZOOM", viewport.width - 206, 56);
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(
        viewModeRef.current === "3d"
          ? "Cesium"
          : `z${Math.round(leafletMapRef.current?.getZoom?.() ?? 7)}`,
        viewport.width - 160,
        56,
      );
      ctx.fillStyle = "#64748b";
      ctx.fillText("PHASE", viewport.width - 206, 78);
      const ph = phaseRef.current;
      ctx.fillStyle =
        ph >= 3
          ? "#8b5cf6"
          : ph === 2
            ? "#ef4444"
            : ph === 1
              ? "#f59e0b"
              : "#94a3b8";
      ctx.fillText(
        ph >= 3
          ? "PREDICTION"
          : ph === 2
            ? "STRIKE"
            : ph === 1
              ? "SORTIE"
              : "IDLE",
        viewport.width - 160,
        78,
      );
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, viewport.width, viewport.height);
      pointHitMapRef.current = [];

      if (viewModeRef.current === "3d") {
        ctx.font = "11px JetBrains Mono";
        ctx.fillStyle = "#64748b";
        ctx.fillText("CESIUM GLOBE · NORTH IRAQ THEATER", 16, 22);
      } else {
        ctx.font = "11px JetBrains Mono";
        ctx.fillStyle = "rgba(100,116,139,0.85)";
        ctx.fillText("TACTICAL MAP · NORTH IRAQ THEATER", 16, 22);
      }

      SITES_DATA.forEach((s) => drawSite(s, t));
      if (phaseRef.current >= 1) {
        drawFlightPath(
          { lat: 36.679, lng: 42.447 },
          { lat: 35.5, lng: 45.1 },
          Math.min(1, t / 90),
          "#f59e0b",
          false,
          "已知出击路线",
          2600,
        );
        drawReconOrbit();
      }
      if (phaseRef.current >= 2) drawStrike(t);
      if (phaseRef.current >= 3) {
        drawFlightPath(
          { lat: 36.679, lng: 42.447 },
          { lat: 34.8, lng: 46.2 },
          (Math.sin(t * 0.03) + 1) / 2,
          "#8b5cf6",
          true,
          "预测再次出击路线",
          2600,
        );
        drawPredictZone();
      }
      drawHUD();
      t++;
      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [viewport]); // ← 只依赖 viewport，其余全部走 ref

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#040810",
      }}
    >
      <div
        ref={leafletContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          display: viewMode === "2d" ? "block" : "none",
        }}
      />
      <div
        ref={cesiumContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          display: viewMode === "3d" ? "block" : "none",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      <div
        ref={hitOverlayRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          background: "transparent",
          pointerEvents: viewMode === "3d" ? "none" : "auto",
          touchAction: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          zIndex: 4,
          fontSize: 10,
          color: "#64748b",
          background: "rgba(4,8,16,0.78)",
          border: "1px solid #1a2d45",
          borderRadius: 4,
          padding: "8px 10px",
          lineHeight: 1.7,
          pointerEvents: "none",
        }}
      >
        {viewMode === "3d"
          ? "Cesium真实投影 · 拖拽旋转 · 点击点位查看事件"
          : "Leaflet底图 · 滚轮缩放 · 拖拽平移 · 点击点位查看事件"}
      </div>
    </div>
  );
});

// 静态方法：父组件调用此方法更新内部 selectedSiteRef，不触发重渲染
TacticalDemo.setSelectedSite = (_key) => {};

// ── 主组件 ───────────────────────────────────────────────────
export default function Report() {
  const [phase, setPhase] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [viewMode, setViewMode] = useState("3d");
  const [expanded, setExpanded] = useState(false);
  const [reportReadyToExport, setReportReadyToExport] = useState(false);
  const [feedbackApplied, setFeedbackApplied] = useState(false);
  const [highlightBlock, setHighlightBlock] = useState("");

  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [siteCardAnchor, setSiteCardAnchor] = useState({ x: 0, y: 0 });
  const [mapContainerWidth, setMapContainerWidth] = useState(600);
  const mapContainerRef = useRef(null);
  const rightPanelRef = useRef(null);
  const timeoutRefs = useRef([]);

  // 持有对 TacticalDemo 实例 selectedSiteRef 的写入函数
  const tacticalSetRef = useRef(null);
  const registerTacticalSetter = useCallback((fn) => {
    tacticalSetRef.current = fn;
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const obs = new ResizeObserver((e) =>
      setMapContainerWidth(e[0].contentRect.width),
    );
    obs.observe(mapContainerRef.current);
    return () => obs.disconnect();
  }, []);

  const clearTimers = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  }, []);

  const startPlayback = useCallback(() => {
    clearTimers();
    setPlaying(true);
    setPhase(0);
    setShowReport(false);
    setReportReadyToExport(false);
    setFeedbackApplied(false);
    setHighlightBlock("");
    setSelectedSite(null);
    setSelectedEvent(null);
    TacticalDemo.setSelectedSite(null);
    timeoutRefs.current.push(
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 2800),
      setTimeout(() => {
        setPhase(3);
        setShowReport(true);
      }, 5200),
      setTimeout(() => setPlaying(false), 5600),
    );
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleExportWord = useCallback(async () => {
    try {
      const paragraphs = (REPORT.summary || "")
        .split("\n")
        .filter((l) => l.trim())
        .map(
          (line) =>
            new Paragraph({
              spacing: { after: 180, line: 360 },
              children: [new TextRun({ text: line, size: 24 })],
            }),
        );
      const doc = new Document({
        creator: "System",
        title: REPORT.title || "分析摘要报告",
        sections: [
          {
            children: [
              new Paragraph({
                spacing: { after: 240 },
                children: [
                  new TextRun({
                    text: REPORT.title || "智能预测分析报告",
                    bold: true,
                    size: 32,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 160 },
                children: [
                  new TextRun({
                    text: `生成时间：${REPORT.generatedAt || ""}`,
                    size: 20,
                    color: "666666",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 220 },
                children: [
                  new TextRun({ text: "分析摘要", bold: true, size: 26 }),
                ],
              }),
              ...paragraphs,
            ],
          },
        ],
      });
      saveAs(await Packer.toBlob(doc), `分析摘要报告_${Date.now()}.docx`);
    } catch (e) {
      console.error("导出失败:", e);
    }
  }, []);

  const handleFeedbackApply = useCallback(() => {
    if (feedbackActive) return;
    setFeedbackActive(true);
    setTimeout(() => {
      setFeedbackApplied(true);
      setFeedbackActive(false);
      setHighlightBlock("reasoning");
      setTimeout(() => setHighlightBlock("breakdown"), 400);
      setTimeout(() => setHighlightBlock("predictions"), 800);
      setTimeout(() => setHighlightBlock("candidates"), 1200);
      setTimeout(() => setHighlightBlock("suggestions"), 1600);
      setTimeout(() => setHighlightBlock(""), 2200);
    }, 2500);
  }, [feedbackActive]);

  const handleSelectSite = useCallback((siteKey, position) => {
    if (!siteKey) {
      setSelectedSite(null);
      setSelectedEvent(null);
      TacticalDemo.setSelectedSite(null);
      return;
    }
    setSelectedSite((prev) => {
      const next = prev === siteKey ? null : siteKey;
      TacticalDemo.setSelectedSite(next);
      if (next === null) setSelectedEvent(null);
      return next;
    });
    if (position) setSiteCardAnchor(position);
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedSite(null);
    setSelectedEvent(null);
    TacticalDemo.setSelectedSite(null);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent((prev) => (prev?.id === event.id ? null : event));
    requestAnimationFrame(() =>
      rightPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" }),
    );
  }, []);

  const displayData = feedbackApplied
    ? {
        confidence: REPORT.feedbackResult.confidence,
        predictions: REPORT.feedbackResult.predictions,
        agentReasoning: REPORT.feedbackResult.agentReasoning,
        confidenceBreakdown: REPORT.feedbackResult.confidenceBreakdown,
        predictionTimeline: REPORT.feedbackResult.predictionTimeline,
        targetCandidates: REPORT.feedbackResult.targetCandidates,
        agentSuggestions: REPORT.feedbackResult.agentSuggestions,
      }
    : {
        confidence: REPORT.confidence,
        predictions: REPORT.predictions,
        agentReasoning: REPORT.agentReasoning,
        confidenceBreakdown: REPORT.confidenceBreakdown,
        predictionTimeline: REPORT.predictionTimeline,
        targetCandidates: REPORT.targetCandidates,
        agentSuggestions: REPORT.agentSuggestions,
      };

  const phaseLabels = [
    { id: 0, label: "待机", desc: "等待演示启动" },
    { id: 1, label: "飞机出击", desc: "F-16×4 06:12离场" },
    { id: 2, label: "打击确认", desc: "卫星验证目标受损" },
    { id: 3, label: "预测输出", desc: "明日05:30预测打击" },
  ];

  return (
    <>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeInCard { from{opacity:0;transform:translateY(-6px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .leaflet-container { background: #040810 !important; }
      `}</style>

      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* 左侧地图区 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#e2e8f0",
                  letterSpacing: "0.05em",
                }}
              >
                {REPORT.title}
              </div>
              <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>
                {REPORT.subtitle}
              </div>
            </div>
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 3,
                background: "#22c55e22",
                border: "1px solid #22c55e",
                fontSize: 10,
                color: "#22c55e",
              }}
            >
              整体置信度 {(displayData.confidence * 100).toFixed(0)}%
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {phaseLabels.map((p) => (
              <div
                key={p.id}
                style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 3,
                  background:
                    phase === p.id
                      ? "#f59e0b22"
                      : phase > p.id
                        ? "#22c55e11"
                        : "#080f1e",
                  border: `1px solid ${phase === p.id ? "#f59e0b" : phase > p.id ? "#22c55e44" : "#1a2d45"}`,
                  transition: "all 0.3s",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color:
                      phase >= p.id
                        ? phase === p.id
                          ? "#f59e0b"
                          : "#22c55e"
                        : "#334155",
                    fontWeight: 700,
                  }}
                >
                  {p.id + 1}. {p.label}
                </div>
                <div style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>
                  {p.desc}
                </div>
              </div>
            ))}
          </div>

          {/* 地图容器 */}
          <div
            ref={mapContainerRef}
            style={{
              flex: 1,
              borderRadius: 4,
              overflow: "hidden",
              border: "1px solid #1a2d45",
              position: "relative",
              minHeight: 0,
              background: "#040810",
            }}
          >
            <TacticalDemo
              phase={phase}
              viewMode={viewMode}
              viewerId="inline-viewer"
              onSelectSite={handleSelectSite}
            />

            {phase >= 1 && (
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  fontSize: 10,
                  color: "#f59e0b",
                  background: "rgba(4,8,16,0.85)",
                  padding: "4px 8px",
                  borderRadius: 3,
                  border: "1px solid #1a2d45",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                {phase === 1 && "◉ 飞机轨迹追踪中"}
                {phase === 2 && "✕ 打击已确认 · 卫星验证"}
                {phase >= 3 && "◈ 预测模式 · 明日行动路线"}
              </div>
            )}

            {/* 点位事件卡片：纯父组件 state 管理，不影响 TacticalDemo */}
            {selectedSite && SITE_EVENTS[selectedSite] && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 20,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "auto",
                  }}
                >
                  <SiteEventCard
                    siteKey={selectedSite}
                    anchor={siteCardAnchor}
                    onClose={handleCloseCard}
                    onSelectEvent={handleSelectEvent}
                    selectedEvent={selectedEvent}
                    containerWidth={mapContainerWidth}
                  />
                </div>
              </div>
            )}

            <div
              style={{
                position: "absolute",
                top: 112,
                right: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                zIndex: 20,
              }}
            >
              <button
                onClick={() => setViewMode((v) => (v === "2d" ? "3d" : "2d"))}
                style={toolBtnStyle(viewMode === "3d")}
              >
                {viewMode === "3d" ? "切换到2D" : "切换到3D"}
              </button>
              <button
                onClick={() => setExpanded(true)}
                style={toolBtnStyle(false)}
              >
                放大查看
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={startPlayback}
              style={{
                flex: 1,
                padding: 10,
                background: playing ? "#0d1a2e" : "#f59e0b22",
                border: `1px solid ${playing ? "#1a2d45" : "#f59e0b"}`,
                color: playing ? "#94a3b8" : "#f59e0b",
                borderRadius: 3,
                cursor: "pointer",
                fontSize: 11,
                letterSpacing: "0.08em",
                fontFamily: "var(--font-mono)",
              }}
            >
              ▶ {phase > 0 ? "重新播放演示" : "启动演示"}
            </button>
            {phase >= 3 && (
              <button
                onClick={handleFeedbackApply}
                style={{
                  flex: 1,
                  padding: 10,
                  background: feedbackActive
                    ? "#22c55e33"
                    : feedbackApplied
                      ? "#0ea5e922"
                      : "#22c55e22",
                  border: `1px solid ${feedbackActive ? "#22c55e" : feedbackApplied ? "#0ea5e9" : "#22c55e66"}`,
                  color: feedbackApplied ? "#0ea5e9" : "#22c55e",
                  borderRadius: 3,
                  cursor: "pointer",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  fontFamily: "var(--font-mono)",
                  transition: "all 0.3s",
                  boxShadow: feedbackActive
                    ? "0 0 20px #22c55e44"
                    : feedbackApplied
                      ? "0 0 18px #0ea5e933"
                      : "none",
                }}
              >
                {feedbackActive
                  ? "↻ 已发送至 Agent · 验证中..."
                  : feedbackApplied
                    ? "✓ 验证结果已回流 Agent"
                    : "↻ 验证结果反哺 Agent"}
              </button>
            )}
          </div>
        </div>

        {/* 右侧报告 */}
        <div
          ref={rightPanelRef}
          style={{
            width: 360,
            flexShrink: 0,
            background: "#040810",
            borderLeft: "1px solid #1a2d45",
            overflowY: "auto",
            padding: 16,
          }}
        >
          {selectedEvent && (
            <EventDetailPanel
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}

          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}
          >
            AUTO REPORT · 自动生成报告
          </div>
          <div
            style={{
              fontSize: 9,
              color: "#1e3a5f",
              marginBottom: 4,
              lineHeight: 1.5,
            }}
          >
            置信度由信实链加权算法生成
            <br />
            <span style={{ color: "#22c55e" }}>✓ 卫星验证</span> 节点权重×1.4
          </div>
          <div style={{ fontSize: 9, color: "#334155", marginBottom: 16 }}>
            {REPORT.generatedAt}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 9,
                color: "#64748b",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              支撑信源
            </div>
            {REPORT.sources.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 10px",
                  marginBottom: 4,
                  background: "#080f1e",
                  borderRadius: 3,
                  border: `1px solid ${s.verified ? "#1e3a5f" : "#1a2d45"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: s.verified ? "#e2e8f0" : "#64748b",
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: confColor(s.confidence),
                      fontWeight: 700,
                    }}
                  >
                    {(s.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div
                  style={{ height: 3, background: "#0d1a2e", borderRadius: 2 }}
                >
                  <div
                    style={{
                      width: `${s.confidence * 100}%`,
                      height: "100%",
                      background: confColor(s.confidence),
                      borderRadius: 2,
                    }}
                  />
                </div>
                {s.verified ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: "#22c55e" }}>
                      ✓ 卫星验证
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "1px 5px",
                        borderRadius: 2,
                        background:
                          s.sourceType === "satellite"
                            ? "#22c55e15"
                            : s.sourceType === "chain"
                              ? "#0ea5e915"
                              : "#64748b15",
                        color:
                          s.sourceType === "satellite"
                            ? "#22c55e"
                            : s.sourceType === "chain"
                              ? "#0ea5e9"
                              : "#64748b",
                        border: `1px solid ${s.sourceType === "satellite" ? "#22c55e33" : s.sourceType === "chain" ? "#0ea5e933" : "#64748b33"}`,
                      }}
                    >
                      {s.sourceType === "satellite"
                        ? "卫星影像"
                        : s.sourceType === "chain"
                          ? "信实链节点"
                          : "OSINT"}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 9, color: "#334155", marginTop: 3 }}>
                    ◌ 未验证 · OSINT
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              background: "#080f1e",
              border: "1px solid #1a2d45",
              borderRadius: 4,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#64748b",
                  letterSpacing: "0.1em",
                }}
              >
                分析摘要
              </div>
              {reportReadyToExport && (
                <button
                  onClick={handleExportWord}
                  style={{
                    padding: "5px 10px",
                    background: "#0ea5e922",
                    border: "1px solid #0ea5e9",
                    color: "#0ea5e9",
                    borderRadius: 3,
                    cursor: "pointer",
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.06em",
                  }}
                >
                  导出Word
                </button>
              )}
            </div>
            <FadeBlock show={showReport} delay={150}>
              <div
                style={{
                  background: "#040810",
                  border: "1px solid #1a2d45",
                  borderRadius: 4,
                  padding: 10,
                  marginBottom: 12,
                  ...hlStyle(highlightBlock === "reasoning"),
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: "#64748b",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  AGENT REASONING · 推理卡片
                </div>
                {displayData.agentReasoning.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "6px 0",
                      borderBottom:
                        idx !== displayData.agentReasoning.length - 1
                          ? "1px solid #101a2b"
                          : "none",
                    }}
                  >
                    <span style={{ fontSize: 10, color: "#64748b" }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: item.color,
                        textAlign: "right",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </FadeBlock>
            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
                lineHeight: 1.8,
                whiteSpace: "pre-line",
                marginBottom: showReport ? 12 : 0,
              }}
            >
              {showReport ? (
                <StreamText
                  text={REPORT.summary}
                  speed={12}
                  onComplete={() => setReportReadyToExport(true)}
                />
              ) : (
                <span style={{ color: "#334155" }}>
                  等待演示启动后自动生成报告...
                </span>
              )}
            </div>
            <FadeBlock show={showReport} delay={900}>
              <div
                style={{
                  background: "#040810",
                  border: "1px solid #1a2d45",
                  borderRadius: 4,
                  padding: 10,
                  ...hlStyle(highlightBlock === "breakdown"),
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: "#64748b",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  CONFIDENCE BREAKDOWN · 置信度来源
                </div>
                {displayData.confidenceBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom:
                        idx !== displayData.confidenceBreakdown.length - 1
                          ? 8
                          : 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: item.color,
                          fontWeight: 700,
                        }}
                      >
                        +{item.score.toFixed(2)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: "#0d1a2e",
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(item.score / 0.35, 1) * 100}%`,
                          height: "100%",
                          background: item.color,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </FadeBlock>
          </div>

          {phase >= 3 && (
            <div
              style={{
                background: "#8b5cf611",
                border: "1px solid #8b5cf6",
                borderRadius: 4,
                padding: 14,
                ...hlStyle(highlightBlock === "predictions"),
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#8b5cf6",
                  letterSpacing: "0.1em",
                  marginBottom: 10,
                }}
              >
                AUTO-ALERT · 自动预测提报
              </div>
              {displayData.predictions.map((p, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 8,
                    paddingBottom: 8,
                    borderBottom:
                      i !== displayData.predictions.length - 1
                        ? "1px solid #2b1f43"
                        : "none",
                  }}
                >
                  <div
                    style={{ fontSize: 10, color: "#8b5cf6", fontWeight: 700 }}
                  >
                    {p.time}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "#e2e8f0", margin: "2px 0" }}
                  >
                    {p.label}
                  </div>
                  <div style={{ fontSize: 10, color: confColor(p.confidence) }}>
                    置信度 {(p.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
              <FadeBlock show delay={200}>
                <div
                  style={{
                    marginTop: 12,
                    background: "#040810",
                    border: "1px solid #1a2d45",
                    borderRadius: 4,
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: "#64748b",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}
                  >
                    PREDICTION WINDOW · 风险时间窗
                  </div>
                  {displayData.predictionTimeline.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom:
                          idx !== displayData.predictionTimeline.length - 1
                            ? 8
                            : 0,
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          fontSize: 10,
                          color: item.color,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {item.time}
                      </div>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: item.color,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ fontSize: 10, color: "#cbd5e1" }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </FadeBlock>
              <FadeBlock show delay={500}>
                <div
                  style={{
                    marginTop: 12,
                    background: "#040810",
                    border: "1px solid #1a2d45",
                    borderRadius: 4,
                    padding: 10,
                    ...hlStyle(highlightBlock === "candidates"),
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: "#64748b",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}
                  >
                    TARGET CANDIDATES · 候选目标
                  </div>
                  {displayData.targetCandidates.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom:
                          idx !== displayData.targetCandidates.length - 1
                            ? 8
                            : 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 10, color: "#e2e8f0" }}>
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: item.color,
                            fontWeight: 700,
                          }}
                        >
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 3,
                          background: "#0d1a2e",
                          borderRadius: 2,
                        }}
                      >
                        <div
                          style={{
                            width: `${item.confidence * 100}%`,
                            height: "100%",
                            background: item.color,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </FadeBlock>
              <FadeBlock show delay={800}>
                <div
                  style={{
                    marginTop: 12,
                    background: "#040810",
                    border: "1px solid #1a2d45",
                    borderRadius: 4,
                    padding: 10,
                    ...hlStyle(highlightBlock === "suggestions"),
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: "#64748b",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}
                  >
                    AGENT SUGGESTIONS · 建议动作
                  </div>
                  {displayData.agentSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: 10,
                        color: "#94a3b8",
                        lineHeight: 1.7,
                        marginBottom:
                          idx !== displayData.agentSuggestions.length - 1
                            ? 6
                            : 0,
                      }}
                    >
                      {idx + 1}. {item}
                    </div>
                  ))}
                </div>
              </FadeBlock>
              <FadeBlock show delay={1000}>
                <div
                  style={{
                    marginTop: 12,
                    padding: 8,
                    background: "#040810",
                    borderRadius: 3,
                    fontSize: 10,
                    color: "#64748b",
                  }}
                >
                  系统将在预测时间前2小时自动触发卫星拍摄任务，验证结果将实时更新本报告。
                </div>
              </FadeBlock>
            </div>
          )}
        </div>
      </div>

      {/* 放大弹窗 */}
      {expanded && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            background: "rgba(2,6,17,0.92)",
            backdropFilter: "blur(10px)",
            display: "flex",
            flexDirection: "column",
            padding: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: "#e2e8f0",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                INTEL REPORT · 战术地图放大视图
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>
                {viewMode === "3d"
                  ? "支持 Cesium 旋转/缩放/点击"
                  : "支持 Leaflet 滚轮缩放/拖拽/点击"}
              </div>
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={toolBtnStyle(false)}
            >
              关闭放大
            </button>
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid #1a2d45",
              background: "#040810",
              position: "relative",
            }}
          >
            <TacticalDemo
              phase={phase}
              viewMode={viewMode}
              viewerId="fullscreen-viewer"
              onSelectSite={handleSelectSite}
            />
            {selectedSite && SITE_EVENTS[selectedSite] && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 20,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "auto",
                  }}
                >
                  <SiteEventCard
                    siteKey={selectedSite}
                    anchor={siteCardAnchor}
                    onClose={handleCloseCard}
                    onSelectEvent={handleSelectEvent}
                    selectedEvent={selectedEvent}
                    containerWidth={800}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function hlStyle(active) {
  return {
    transition: "all 0.35s ease",
    boxShadow: active ? "0 0 0 1px #22c55e55,0 0 18px #22c55e22" : "none",
    borderColor: active ? "#22c55e" : undefined,
  };
}
function toolBtnStyle(active) {
  return {
    padding: "7px 12px",
    background: active ? "#f59e0b22" : "rgba(4,8,16,0.88)",
    border: `1px solid ${active ? "#f59e0b" : "#1a2d45"}`,
    color: active ? "#f59e0b" : "#cbd5e1",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 10,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.06em",
  };
}
