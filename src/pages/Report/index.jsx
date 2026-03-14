import { useState, useEffect, useRef, useCallback } from "react";
import { REPORT } from "../../data/mockData";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
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
} from "cesium";

// ── 置信度颜色 ────────────────────────────────────────────────
function confColor(c) {
  if (c >= 0.85) return "#22c55e";
  if (c >= 0.65) return "#f59e0b";
  if (c >= 0.45) return "#f97316";
  return "#ef4444";
}

// ── 流式文字效果 ─────────────────────────────────────────────
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
        const next = text.slice(0, idx.current + 1);
        setDisplayed(next);
        idx.current++;

        if (idx.current >= text.length && !completedRef.current) {
          completedRef.current = true;
          clearInterval(timer);
          onCompleteRef.current?.();
        }
      } else {
        clearInterval(timer);
      }
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

function FadeBlock({ show, delay = 0, children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer;

    if (show) {
      timer = setTimeout(() => {
        setVisible(true);
      }, delay);
    } else {
      setVisible(false);
    }

    return () => clearTimeout(timer);
  }, [show, delay]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(8px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
      }}
    >
      {children}
    </div>
  );
}

function TacticalDemo({ phase, viewMode = "3d", viewerId = "main" }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const cesiumRef = useRef(null);
  const viewerRef = useRef(null);
  const animRef = useRef(null);
  const phaseRef = useRef(phase);

  const transformRef = useRef({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  const [viewport, setViewport] = useState({ width: 900, height: 520 });
  const [zoomView, setZoomView] = useState(1);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // 自适应尺寸
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setViewport({
        width: Math.max(300, Math.floor(rect.width)),
        height: Math.max(240, Math.floor(rect.height)),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => observer.disconnect();
  }, [viewerId]);

  const resetView = useCallback(() => {
    transformRef.current.scale = 1;
    transformRef.current.offsetX = 0;
    transformRef.current.offsetY = 0;
    setZoomView(1);
  }, []);

  // 初始化 Cesium：仅作为 3D 模式底图
  useEffect(() => {
    let destroyed = false;

    async function initCesium() {
      if (!cesiumRef.current || viewerRef.current) return;

      const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
      if (ionToken) {
        Ion.defaultAccessToken = ionToken;
      }

      const viewer = new Viewer(cesiumRef.current, {
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
        imageryProvider: new UrlTemplateImageryProvider({
          url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          credit: "©OpenStreetMap ©CARTO",
        }),
        terrainProvider: new EllipsoidTerrainProvider(),
      });

      if (destroyed) {
        viewer.destroy();
        return;
      }

      viewerRef.current = viewer;
      viewer.scene.globe.enableLighting = true;
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.fog.enabled = true;
      viewer.scene.globe.baseColor = Color.fromCssColorString("#050b14");
      viewer.scene.backgroundColor = Color.fromCssColorString("#040810");
      viewer.scene.moon.show = false;
      viewer.scene.sun.show = true;

      if (viewer.cesiumWidget?.creditContainer) {
        viewer.cesiumWidget.creditContainer.style.display = "none";
      }

      try {
        if (ionToken) {
          viewer.terrainProvider = await createWorldTerrainAsync();
          const osmBuildings = await createOsmBuildingsAsync();
          viewer.scene.primitives.add(osmBuildings);
        }
      } catch (err) {
        console.warn(
          "Cesium terrain/buildings load failed, fallback to basic globe:",
          err,
        );
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

    initCesium();

    return () => {
      destroyed = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [viewerId]);

  // 仅 2D 模式启用原缩放/拖拽逻辑；3D 模式交给 Cesium
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    if (viewMode === "3d") {
      wrap.style.cursor = "default";
      return;
    }

    const onWheel = (e) => {
      e.preventDefault();
      const t = transformRef.current;
      const next = Math.max(
        0.75,
        Math.min(4, t.scale + (e.deltaY < 0 ? 0.12 : -0.12)),
      );
      t.scale = next;
      setZoomView(next);
    };

    const onPointerDown = (e) => {
      const t = transformRef.current;
      t.dragging = true;
      t.lastX = e.clientX;
      t.lastY = e.clientY;
      wrap.style.cursor = "grabbing";
    };

    const onPointerMove = (e) => {
      const t = transformRef.current;
      if (!t.dragging) return;
      const dx = e.clientX - t.lastX;
      const dy = e.clientY - t.lastY;
      t.offsetX += dx;
      t.offsetY += dy;
      t.lastX = e.clientX;
      t.lastY = e.clientY;
    };

    const onPointerUp = () => {
      const t = transformRef.current;
      t.dragging = false;
      wrap.style.cursor = "grab";
    };

    const onDoubleClick = () => {
      resetView();
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("dblclick", onDoubleClick);

    wrap.style.cursor = "grab";

    return () => {
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("dblclick", onDoubleClick);
    };
  }, [resetView, viewMode]);

  // 3D 模式下调整 Cesium 相机
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

  // 主绘制
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

    const bounds = {
      minLng: 38,
      maxLng: 49,
      minLat: 32,
      maxLat: 38.8,
    };

    const sites = [
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

    function mapToScreen2D(lat, lng) {
      const x =
        ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) *
        viewport.width;
      const y =
        ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) *
        viewport.height;
      return { x, y };
    }

    function projectPoint2D(x, y) {
      const tr = transformRef.current;
      const cx = viewport.width / 2;
      const cy = viewport.height / 2;

      let px = (x - cx) * tr.scale + cx + tr.offsetX;
      let py = (y - cy) * tr.scale + cy + tr.offsetY;

      return { x: px, y: py };
    }

    function projectPointPseudo3D(x, y) {
      let px = x;
      let py = y;

      const horizon = viewport.height * 0.18;
      const groundTop = viewport.height * 0.2;
      const depth = (py - groundTop) / (viewport.height - groundTop);
      const clampedDepth = Math.max(0, Math.min(1, depth));
      const compress = 0.42 + clampedDepth * 0.58;
      py = horizon + (py - horizon) * compress;

      return { x: px, y: py };
    }

    function getCesiumScreenPoint(lat, lng, alt = 0) {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return null;

      const cart = Cartesian3.fromDegrees(lng, lat, alt);
      const pos = viewer.scene.cartesianToCanvasCoordinates(cart);
      if (!pos) return null;

      // 在球背面/视锥外时可能为 undefined；这里再做一次边界过滤
      if (
        Number.isNaN(pos.x) ||
        Number.isNaN(pos.y) ||
        pos.x < -120 ||
        pos.x > viewport.width + 120 ||
        pos.y < -120 ||
        pos.y > viewport.height + 120
      ) {
        return null;
      }

      return { x: pos.x, y: pos.y };
    }

    function getScreenPoint(lat, lng, alt = 0) {
      if (viewMode === "2d") {
        const p = mapToScreen2D(lat, lng);
        return projectPoint2D(p.x, p.y);
      }
      return getCesiumScreenPoint(lat, lng, alt);
    }

    function drawBackground2D() {
      const bg = ctx.createLinearGradient(0, 0, 0, viewport.height);
      bg.addColorStop(0, "#020611");
      bg.addColorStop(0.4, "#05111d");
      bg.addColorStop(1, "#03101c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, viewport.width, viewport.height);

      ctx.save();
      ctx.strokeStyle = "#14304e";
      ctx.lineWidth = 1;

      const gridStep = 48 * transformRef.current.scale;
      const ox = transformRef.current.offsetX % gridStep;
      const oy = transformRef.current.offsetY % gridStep;

      for (
        let x = ox - gridStep;
        x < viewport.width + gridStep;
        x += gridStep
      ) {
        const p1 = projectPoint2D(x, 0);
        const p2 = projectPoint2D(x, viewport.height);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      for (
        let y = oy - gridStep;
        y < viewport.height + gridStep;
        y += gridStep
      ) {
        const p1 = projectPoint2D(0, y);
        const p2 = projectPoint2D(viewport.width, y);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();

      const p1 = mapToScreen2D(38.0, 40.0);
      const p2 = mapToScreen2D(33.0, 48.0);
      const q1 = projectPoint2D(p1.x, p1.y);
      const q2 = projectPoint2D(p2.x, p2.y);
      ctx.fillStyle = "rgba(245,158,11,0.05)";
      ctx.strokeStyle = "rgba(245,158,11,0.18)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.rect(q1.x, q1.y, q2.x - q1.x, q2.y - q1.y);
      ctx.fill();
      ctx.stroke();

      ctx.font = "11px JetBrains Mono";
      ctx.fillStyle = "#64748b";
      ctx.fillText("TACTICAL MAP · NORTH IRAQ THEATER", 16, 22);

      ctx.font = "10px JetBrains Mono";
      ctx.fillStyle = "#35506d";
      for (let lng = 39; lng <= 48; lng += 3) {
        const p = mapToScreen2D(32.2, lng);
        const s = projectPoint2D(p.x, p.y);
        ctx.fillText(`${lng}E`, s.x - 10, s.y - 8);
      }
      for (let lat = 33; lat <= 38; lat += 2) {
        const p = mapToScreen2D(lat, 38.2);
        const s = projectPoint2D(p.x, p.y);
        ctx.fillText(`${lat}N`, s.x + 4, s.y);
      }
    }

    function drawBackground3D() {
      const sky = ctx.createLinearGradient(0, 0, 0, viewport.height * 0.35);
      sky.addColorStop(0, "rgba(14,165,233,0.08)");
      sky.addColorStop(1, "rgba(4,8,16,0.00)");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, viewport.width, viewport.height * 0.35);

      ctx.save();
      ctx.strokeStyle = "rgba(20,48,78,0.18)";
      ctx.lineWidth = 1;
      for (let x = 80; x < viewport.width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, viewport.height);
        ctx.stroke();
      }
      for (let y = 70; y < viewport.height; y += 70) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(viewport.width, y);
        ctx.stroke();
      }
      ctx.restore();

      ctx.font = "11px JetBrains Mono";
      ctx.fillStyle = "#64748b";
      ctx.fillText("CESIUM GLOBE · NORTH IRAQ THEATER", 16, 22);
    }

    function drawBackground() {
      if (viewMode === "2d") {
        drawBackground2D();
      } else {
        drawBackground3D();
      }
    }

    function drawSite(site, timeTick) {
      const p = getScreenPoint(site.lat, site.lng, site.alt);
      if (!p) return;

      const finalP = viewMode === "3d" ? p : p;
      const pulse = (Math.sin(timeTick * 0.05 + site.lat) + 1) / 2;

      ctx.beginPath();
      ctx.arc(finalP.x, finalP.y, 8 + pulse * 10, 0, Math.PI * 2);
      ctx.strokeStyle = site.color + "44";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(finalP.x, finalP.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = site.color;
      ctx.fill();

      ctx.font = "10px JetBrains Mono";
      ctx.fillStyle = site.color;
      ctx.fillText(site.label, finalP.x + 10, finalP.y - 6);
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
      const a = getScreenPoint(from.lat, from.lng, alt);
      const b = getScreenPoint(to.lat, to.lng, alt);

      if (!a || !b) return;

      const drawA = viewMode === "3d" ? a : a;
      const drawB = viewMode === "3d" ? b : b;

      const mx = drawA.x + (drawB.x - drawA.x) * progress;
      const my = drawA.y + (drawB.y - drawA.y) * progress;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (dashed) ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(drawA.x, drawA.y);
      ctx.lineTo(mx, my);
      ctx.stroke();
      ctx.restore();

      const angle = Math.atan2(drawB.y - drawA.y, drawB.x - drawA.x);
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
        ctx.font = "10px JetBrains Mono";
        ctx.fillStyle = color;
        ctx.fillText(
          label,
          drawA.x + (drawB.x - drawA.x) * 0.42,
          drawA.y + (drawB.y - drawA.y) * 0.42 - 12,
        );
      }
    }

    function drawReconOrbit() {
      if (viewMode === "2d") {
        const center = projectPoint2D(
          mapToScreen2D(35.1, 43.9).x,
          mapToScreen2D(35.1, 43.9).y,
        );
        const r = 16;
        ctx.save();
        ctx.strokeStyle = "#0ea5e9";
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, r + 4, r, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.font = "10px JetBrains Mono";
        ctx.fillStyle = "#0ea5e9";
        ctx.fillText("侦察盘旋区域", center.x + 18, center.y + 6);
        return;
      }

      // 3D：用真实经纬度环带投影成屏幕折线
      const pts = [];
      const centerLng = 43.9;
      const centerLat = 35.1;
      const rx = 0.32;
      const ry = 0.2;

      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const lng = centerLng + Math.cos(a) * rx;
        const lat = centerLat + Math.sin(a) * ry;
        const p = getScreenPoint(lat, lng, 2200);
        if (p) pts.push(p);
      }

      if (pts.length > 2) {
        ctx.save();
        ctx.strokeStyle = "#0ea5e9";
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        ctx.restore();

        const c = getScreenPoint(centerLat, centerLng, 2200);
        if (c) {
          ctx.font = "10px JetBrains Mono";
          ctx.fillStyle = "#0ea5e9";
          ctx.fillText("侦察盘旋区域", c.x + 18, c.y + 6);
        }
      }
    }

    function drawStrike(timeTick) {
      const p = getScreenPoint(35.5, 45.1, 1500);
      if (!p) return;

      const blast = (Math.sin(timeTick * 0.15) + 1) / 2;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 10 + blast * 18, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239,68,68,${0.12 + blast * 0.22})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();

      ctx.font = "bold 10px JetBrains Mono";
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
      ctx.fillStyle = "#8b5cf6";
      ctx.fillText("预测目标圈定", p.x + 12, p.y - 10);
    }

    function drawOverlayInfo() {
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
        viewMode === "3d" ? "CESIUM 3D" : "2D MAP",
        viewport.width - 160,
        34,
      );

      ctx.fillStyle = "#64748b";
      ctx.fillText("ZOOM", viewport.width - 206, 56);
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(
        viewMode === "3d" ? "Cesium" : `${zoomView.toFixed(2)}x`,
        viewport.width - 160,
        56,
      );

      ctx.fillStyle = "#64748b";
      ctx.fillText("PHASE", viewport.width - 206, 78);
      ctx.fillStyle =
        phaseRef.current >= 3
          ? "#8b5cf6"
          : phaseRef.current === 2
            ? "#ef4444"
            : phaseRef.current === 1
              ? "#f59e0b"
              : "#94a3b8";

      ctx.fillText(
        phaseRef.current >= 3
          ? "PREDICTION"
          : phaseRef.current === 2
            ? "STRIKE"
            : phaseRef.current === 1
              ? "SORTIE"
              : "IDLE",
        viewport.width - 160,
        78,
      );
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, viewport.width, viewport.height);

      drawBackground();

      sites.forEach((site) => drawSite(site, t));

      if (phaseRef.current >= 1) {
        const progress1 = Math.min(1, t / 90);
        drawFlightPath(
          { lat: 36.679, lng: 42.447 },
          { lat: 35.5, lng: 45.1 },
          progress1,
          "#f59e0b",
          false,
          "已知出击路线",
          2600,
        );
        drawReconOrbit();
      }

      if (phaseRef.current >= 2) {
        drawStrike(t);
      }

      if (phaseRef.current >= 3) {
        const progress2 = (Math.sin(t * 0.03) + 1) / 2;
        drawFlightPath(
          { lat: 36.679, lng: 42.447 },
          { lat: 34.8, lng: 46.2 },
          progress2,
          "#8b5cf6",
          true,
          "预测再次出击路线",
          2600,
        );
        drawPredictZone();
      }

      drawOverlayInfo();

      t++;
      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [viewport, viewMode, zoomView, viewerId]);

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#040810",
        touchAction: viewMode === "3d" ? "auto" : "none",
      }}
    >
      <div
        ref={cesiumRef}
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
          pointerEvents: viewMode === "3d" ? "none" : "auto",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "12px",
          bottom: "12px",
          zIndex: 3,
          fontSize: "10px",
          color: "#64748b",
          background: "rgba(4,8,16,0.78)",
          border: "1px solid #1a2d45",
          borderRadius: "4px",
          padding: "8px 10px",
          lineHeight: 1.7,
          pointerEvents: "none",
        }}
      >
        {viewMode === "3d"
          ? "Cesium真实投影 · 拖拽旋转 · 滚轮缩放"
          : "滚轮缩放 · 按住拖拽平移 · 双击重置视图"}
      </div>
    </div>
  );
}

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
  const timeoutRefs = useRef([]);

  const clearPlaybackTimers = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  }, []);

  const startPlayback = useCallback(() => {
    clearPlaybackTimers();

    setPlaying(true);
    setPhase(0);
    setShowReport(false);
    setReportReadyToExport(false);
    setFeedbackApplied(false);
    setHighlightBlock("");

    timeoutRefs.current.push(
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 2800),
      setTimeout(() => {
        setPhase(3);
        setShowReport(true);
      }, 5200),
      setTimeout(() => setPlaying(false), 5600),
    );
  }, [clearPlaybackTimers]);

  useEffect(() => {
    return () => clearPlaybackTimers();
  }, [clearPlaybackTimers]);

  const handleReportComplete = useCallback(() => {
    setReportReadyToExport(true);
  }, []);

  const handleExportWord = useCallback(async () => {
    try {
      const summaryText = REPORT.summary || "";

      const paragraphs = summaryText
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map(
          (line) =>
            new Paragraph({
              spacing: {
                after: 180,
                line: 360,
              },
              children: [
                new TextRun({
                  text: line,
                  size: 24,
                }),
              ],
            }),
        );

      const doc = new Document({
        creator: "OpenAI",
        title: REPORT.title || "分析摘要报告",
        description: "智能预测分析摘要导出文档",
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
                  new TextRun({
                    text: "分析摘要",
                    bold: true,
                    size: 26,
                  }),
                ],
              }),
              ...paragraphs,
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `分析摘要报告_${Date.now()}.docx`);
    } catch (error) {
      console.error("导出 Word 失败:", error);
    }
  }, []);

  const handleFeedbackApply = useCallback(() => {
    if (feedbackActive) return;

    setFeedbackActive(true);

    setTimeout(() => {
      setFeedbackApplied(true);
      setFeedbackActive(false);

      // 依次高亮更新块
      setHighlightBlock("reasoning");
      setTimeout(() => setHighlightBlock("breakdown"), 400);
      setTimeout(() => setHighlightBlock("predictions"), 800);
      setTimeout(() => setHighlightBlock("candidates"), 1200);
      setTimeout(() => setHighlightBlock("suggestions"), 1600);
      setTimeout(() => setHighlightBlock(""), 2200);
    }, 2500);
  }, [feedbackActive]);

  const phaseLabels = [
    { id: 0, label: "待机", desc: "等待演示启动" },
    { id: 1, label: "飞机出击", desc: "F-16×4 06:12离场" },
    { id: 2, label: "打击确认", desc: "卫星验证目标受损" },
    { id: 3, label: "预测输出", desc: "明日05:30预测打击" },
  ];

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

  return (
    <>
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* 左侧：地图演示 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "16px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              marginBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#e2e8f0",
                  letterSpacing: "0.05em",
                }}
              >
                {REPORT.title}
              </div>
              <div
                style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}
              >
                {REPORT.subtitle}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: "3px",
                  background: "#22c55e22",
                  border: "1px solid #22c55e",
                  fontSize: "10px",
                  color: "#22c55e",
                }}
              >
                整体置信度 {(displayData.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            {phaseLabels.map((p) => (
              <div
                key={p.id}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "3px",
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
                    fontSize: "9px",
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
                <div
                  style={{
                    fontSize: "8px",
                    color: "#64748b",
                    marginTop: "2px",
                  }}
                >
                  {p.desc}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              borderRadius: "4px",
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
            />

            {phase >= 1 && (
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  fontSize: "10px",
                  color: "#f59e0b",
                  background: "rgba(4,8,16,0.85)",
                  padding: "4px 8px",
                  borderRadius: "3px",
                  border: "1px solid #1a2d45",
                }}
              >
                {phase === 1 && "◉ 飞机轨迹追踪中"}
                {phase === 2 && "✕ 打击已确认 · 卫星验证"}
                {phase >= 3 && "◈ 预测模式 · 明日行动路线"}
              </div>
            )}

            <div
              style={{
                position: "absolute",
                top: "112px",
                right: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
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

          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button
              onClick={startPlayback}
              style={{
                flex: 1,
                padding: "10px",
                background: playing ? "#0d1a2e" : "#f59e0b22",
                border: `1px solid ${playing ? "#1a2d45" : "#f59e0b"}`,
                color: playing ? "#94a3b8" : "#f59e0b",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "11px",
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
                  padding: "10px",
                  background: feedbackActive
                    ? "#22c55e33"
                    : feedbackApplied
                      ? "#0ea5e922"
                      : "#22c55e22",
                  border: `1px solid ${feedbackActive ? "#22c55e" : feedbackApplied ? "#0ea5e9" : "#22c55e66"}`,
                  color: feedbackApplied ? "#0ea5e9" : "#22c55e",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "11px",
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

        {/* 右侧：报告 */}
        <div
          style={{
            width: "360px",
            flexShrink: 0,
            background: "#040810",
            borderLeft: "1px solid #1a2d45",
            overflowY: "auto",
            padding: "16px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "#64748b",
              letterSpacing: "0.1em",
              marginBottom: "6px",
            }}
          >
            AUTO REPORT · 自动生成报告
          </div>
          <div
            style={{
              fontSize: "9px",
              color: "#1e3a5f",
              marginBottom: "4px",
              lineHeight: 1.5,
            }}
          >
            置信度由信实链加权算法生成
            <br />
            <span style={{ color: "#22c55e" }}>✓ 卫星验证</span> 节点权重×1.4
          </div>
          <div
            style={{ fontSize: "9px", color: "#334155", marginBottom: "16px" }}
          >
            {REPORT.generatedAt}
          </div>

          {/* 信源列表 */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "9px",
                color: "#64748b",
                letterSpacing: "0.1em",
                marginBottom: "8px",
              }}
            >
              支撑信源
            </div>
            {REPORT.sources.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 10px",
                  marginBottom: "4px",
                  background: "#080f1e",
                  borderRadius: "3px",
                  border: `1px solid ${s.verified ? "#1e3a5f" : "#1a2d45"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: s.verified ? "#e2e8f0" : "#64748b",
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: confColor(s.confidence),
                      fontWeight: 700,
                    }}
                  >
                    {(s.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    background: "#0d1a2e",
                    borderRadius: "2px",
                  }}
                >
                  <div
                    style={{
                      width: `${s.confidence * 100}%`,
                      height: "100%",
                      background: confColor(s.confidence),
                      borderRadius: "2px",
                    }}
                  />
                </div>

                {s.verified ? (
                  <div
                    style={{ display: "flex", gap: "6px", marginTop: "3px" }}
                  >
                    <span style={{ fontSize: "9px", color: "#22c55e" }}>
                      ✓ 卫星验证
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        padding: "1px 5px",
                        borderRadius: "2px",
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
                        border: `1px solid ${
                          s.sourceType === "satellite"
                            ? "#22c55e33"
                            : s.sourceType === "chain"
                              ? "#0ea5e933"
                              : "#64748b33"
                        }`,
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
                  <div
                    style={{
                      fontSize: "9px",
                      color: "#334155",
                      marginTop: "3px",
                    }}
                  >
                    ◌ 未验证 · OSINT
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 分析摘要 + Agent 信息 */}
          <div
            style={{
              background: "#080f1e",
              border: "1px solid #1a2d45",
              borderRadius: "4px",
              padding: "14px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "9px",
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
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "9px",
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
                  borderRadius: "4px",
                  padding: "10px",
                  marginBottom: "12px",
                  ...getHighlightStyle(highlightBlock === 'reasoning'),
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    color: "#64748b",
                    letterSpacing: "0.1em",
                    marginBottom: "8px",
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
                      gap: "10px",
                      padding: "6px 0",
                      borderBottom:
                        idx !== REPORT.agentReasoning.length - 1
                          ? "1px solid #101a2b"
                          : "none",
                    }}
                  >
                    <span style={{ fontSize: "10px", color: "#64748b" }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
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
                fontSize: "11px",
                color: "#94a3b8",
                lineHeight: 1.8,
                whiteSpace: "pre-line",
                marginBottom: showReport ? "12px" : 0,
              }}
            >
              {showReport ? (
                <StreamText
                  text={REPORT.summary}
                  speed={12}
                  onComplete={handleReportComplete}
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
                  borderRadius: "4px",
                  padding: "10px",
                  ...getHighlightStyle(highlightBlock === 'breakdown'),
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    color: "#64748b",
                    letterSpacing: "0.1em",
                    marginBottom: "8px",
                  }}
                >
                  CONFIDENCE BREAKDOWN · 置信度来源
                </div>

                {displayData.confidenceBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom:
                        idx !== REPORT.confidenceBreakdown.length - 1
                          ? "8px"
                          : 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          color: item.color,
                          fontWeight: 700,
                        }}
                      >
                        +{item.score.toFixed(2)}
                      </span>
                    </div>

                    <div
                      style={{
                        height: "3px",
                        background: "#0d1a2e",
                        borderRadius: "2px",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(item.score / 0.35, 1) * 100}%`,
                          height: "100%",
                          background: item.color,
                          borderRadius: "2px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </FadeBlock>
          </div>

          {/* 预测提报增强区 */}
          {phase >= 3 && (
            <div
              style={{
                background: "#8b5cf611",
                border: "1px solid #8b5cf6",
                borderRadius: "4px",
                padding: "14px",
                ...getHighlightStyle(highlightBlock === 'predictions'),
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  color: "#8b5cf6",
                  letterSpacing: "0.1em",
                  marginBottom: "10px",
                }}
              >
                AUTO-ALERT · 自动预测提报
              </div>

              {displayData.predictions.map((p, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: "8px",
                    paddingBottom: "8px",
                    borderBottom:
                      i !== REPORT.predictions.length - 1
                        ? "1px solid #2b1f43"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#8b5cf6",
                      fontWeight: 700,
                    }}
                  >
                    {p.time}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#e2e8f0",
                      margin: "2px 0",
                    }}
                  >
                    {p.label}
                  </div>
                  <div
                    style={{ fontSize: "10px", color: confColor(p.confidence) }}
                  >
                    置信度 {(p.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}

              <FadeBlock show={phase >= 3} delay={200}>
                <div
                  style={{
                    marginTop: "12px",
                    background: "#040810",
                    border: "1px solid #1a2d45",
                    borderRadius: "4px",
                    padding: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "9px",
                      color: "#64748b",
                      letterSpacing: "0.1em",
                      marginBottom: "8px",
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
                        gap: "8px",
                        marginBottom:
                          idx !== REPORT.predictionTimeline.length - 1
                            ? "8px"
                            : 0,
                      }}
                    >
                      <div
                        style={{
                          width: "46px",
                          fontSize: "10px",
                          color: item.color,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {item.time}
                      </div>

                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: item.color,
                          flexShrink: 0,
                        }}
                      />

                      <div style={{ fontSize: "10px", color: "#cbd5e1" }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </FadeBlock>

              <FadeBlock show={phase >= 3} delay={500}>
                <div
                  style={{
                    marginTop: "12px",
                    background: "#040810",
                    border: "1px solid #1a2d45",
                    borderRadius: "4px",
                    padding: "10px",
                    ...getHighlightStyle(highlightBlock === 'candidates'),
                  }}
                >
                  <div
                    style={{
                      fontSize: "9px",
                      color: "#64748b",
                      letterSpacing: "0.1em",
                      marginBottom: "8px",
                    }}
                  >
                    TARGET CANDIDATES · 候选目标
                  </div>

                  {displayData.targetCandidates.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom:
                          idx !== REPORT.targetCandidates.length - 1
                            ? "8px"
                            : 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ fontSize: "10px", color: "#e2e8f0" }}>
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            color: item.color,
                            fontWeight: 700,
                          }}
                        >
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div
                        style={{
                          height: "3px",
                          background: "#0d1a2e",
                          borderRadius: "2px",
                        }}
                      >
                        <div
                          style={{
                            width: `${item.confidence * 100}%`,
                            height: "100%",
                            background: item.color,
                            borderRadius: "2px",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </FadeBlock>

              <FadeBlock show={phase >= 3} delay={800}>
                <div
                  style={{
                    marginTop: "12px",
                    background: "#040810",
                    border: "1px solid #1a2d45",
                    borderRadius: "4px",
                    padding: "10px",
                    ...getHighlightStyle(highlightBlock === 'suggestions'),
                  }}
                >
                  <div
                    style={{
                      fontSize: "9px",
                      color: "#64748b",
                      letterSpacing: "0.1em",
                      marginBottom: "8px",
                    }}
                  >
                    AGENT SUGGESTIONS · 建议动作
                  </div>

                  {displayData.agentSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: "10px",
                        color: "#94a3b8",
                        lineHeight: 1.7,
                        marginBottom:
                          idx !== REPORT.agentSuggestions.length - 1
                            ? "6px"
                            : 0,
                      }}
                    >
                      {idx + 1}. {item}
                    </div>
                  ))}
                </div>
              </FadeBlock>

              <FadeBlock show={phase >= 3} delay={1000}>
                <div
                  style={{
                    marginTop: "12px",
                    padding: "8px",
                    background: "#040810",
                    borderRadius: "3px",
                    fontSize: "10px",
                    color: "#64748b",
                  }}
                >
                  系统将在预测时间前2小时自动触发卫星拍摄任务，验证结果将实时更新本报告。
                </div>
              </FadeBlock>
            </div>
          )}

          <style>{`
            @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
          `}</style>
        </div>
      </div>

      {/* 放大查看 */}
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
            padding: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#e2e8f0",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                INTEL REPORT · 战术地图放大视图
              </div>
              <div
                style={{ fontSize: "10px", color: "#64748b", marginTop: "3px" }}
              >
                {viewMode === "3d"
                  ? "支持 Cesium 旋转 / 缩放"
                  : "支持滚轮缩放 / 拖拽平移 / 双击重置"}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setViewMode((v) => (v === "2d" ? "3d" : "2d"))}
                style={toolBtnStyle(viewMode === "3d")}
              >
                {viewMode === "3d" ? "切换到2D" : "切换到3D"}
              </button>
              <button
                onClick={() => setExpanded(false)}
                style={toolBtnStyle(false)}
              >
                关闭放大
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid #1a2d45",
              background: "#040810",
            }}
          >
            <TacticalDemo
              phase={phase}
              viewMode={viewMode}
              viewerId="fullscreen-viewer"
            />
          </div>
        </div>
      )}
    </>
  );
}

function getHighlightStyle(active) {
  return {
    transition: 'all 0.35s ease',
    boxShadow: active ? '0 0 0 1px #22c55e55, 0 0 18px #22c55e22' : 'none',
    borderColor: active ? '#22c55e' : undefined,
  }
}

function toolBtnStyle(active) {
  return {
    padding: "7px 12px",
    background: active ? "#f59e0b22" : "rgba(4,8,16,0.88)",
    border: `1px solid ${active ? "#f59e0b" : "#1a2d45"}`,
    color: active ? "#f59e0b" : "#cbd5e1",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "10px",
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.06em",
  };
}
