import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { EVENTS } from "../../data/mockData";

// ── 颜色工具 ──────────────────────────────────────────────────
const scoreColor = (v) =>
  v >= 80 ? "#22c55e" : v >= 60 ? "#f59e0b" : v >= 40 ? "#f97316" : "#ef4444";
const statusColor = (s) =>
  ({ operational: "#22c55e", damaged: "#f59e0b", destroyed: "#ef4444" })[s] ??
  "#ef4444";
const statusLabel = (s) =>
  ({ operational: "运行中", damaged: "受损", destroyed: "被摧毁" })[s] ??
  "被摧毁";

// ── 武器射程配置 ──────────────────────────────────────────────
const WEAPON_PRESETS = [
  {
    id: "srm",
    label: "近程",
    sub: "SRM / 直升机",
    km: 50,
    color: "#22c55e",
    heatColor: "34,197,94",
  },
  {
    id: "mrm",
    label: "中程",
    sub: "MRM / 巡航导弹",
    km: 150,
    color: "#f59e0b",
    heatColor: "245,158,11",
  },
  {
    id: "lrm",
    label: "远程",
    sub: "LRM / 弹道导弹",
    km: 300,
    color: "#ef4444",
    heatColor: "239,68,68",
  },
  {
    id: "icbm",
    label: "洲际",
    sub: "ICBM",
    km: 800,
    color: "#a855f7",
    heatColor: "168,85,247",
  },
];

// ══════════════════════════════════════════════════════════════
//  RadiusCanvas — 作战半径 Canvas 动画层
//  挂在地图容器内，position:absolute 全覆盖，pointerEvents:none
// ══════════════════════════════════════════════════════════════
export function RadiusCanvas({ viewerRef, cesiumRef, site, activeWeapons }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  // 同步 canvas 尺寸
  useEffect(() => {
    const syncSize = () => {
      const viewer = viewerRef.current;
      const canvas = canvasRef.current;
      if (!viewer || !canvas) return;
      const c = viewer.scene?.canvas;
      if (!c) return;
      canvas.width = c.clientWidth;
      canvas.height = c.clientHeight;
    };
    syncSize();
    window.addEventListener("resize", syncSize);
    return () => window.removeEventListener("resize", syncSize);
  }, [viewerRef]);

  // 渲染循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getGeo = (km) => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      if (!viewer || !Cesium || !site?.lat || !site?.lng) return null;
      const { Cartesian3, SceneTransforms } = Cesium;
      const project =
        SceneTransforms.worldToWindowCoordinates ??
        SceneTransforms.wgs84ToWindowCoordinates;
      const center = Cartesian3.fromDegrees(site.lng, site.lat, 0);
      const cs = project(viewer.scene, center);
      if (!cs) return null;
      const offsetLng =
        site.lng + km / (111.32 * Math.cos((site.lat * Math.PI) / 180));
      const edge = Cartesian3.fromDegrees(offsetLng, site.lat, 0);
      const es = project(viewer.scene, edge);
      if (!es) return null;
      const screenR = Math.abs(es.x - cs.x);
      if (screenR < 4 || screenR > 9000) return null;
      return { cx: cs.x, cy: cs.y, r: screenR };
    };

    const render = (ts) => {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 从外到内绘制（大半径先画）
      const sorted = WEAPON_PRESETS.filter((w) =>
        activeWeapons.includes(w.id),
      ).sort((a, b) => b.km - a.km);

      sorted.forEach((w) => {
        const geo = getGeo(w.km);
        if (!geo) return;
        const { cx, cy, r } = geo;
        const rgb = w.heatColor;

        // ① 热力径向渐变填充
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${rgb},0.20)`);
        grad.addColorStop(0.45, `rgba(${rgb},0.09)`);
        grad.addColorStop(0.8, `rgba(${rgb},0.03)`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // ② 旋转虚线边界
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-(ts / 5000) * Math.PI * 2);
        ctx.translate(-cx, -cy);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},0.7)`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([12, 6]);
        ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);

        // ③ 扩散波纹（3圈，相位各错 1/3）
        for (let i = 0; i < 3; i++) {
          const phase = (ts / 2200 + i / 3) % 1;
          const wR = r * (0.5 + phase * 0.55);
          const alpha = (1 - phase) * 0.5;
          if (wR <= 0) continue;
          ctx.beginPath();
          ctx.arc(cx, cy, wR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb},${alpha})`;
          ctx.lineWidth = 1.2 - phase * 0.9;
          ctx.stroke();
        }

        // ④ 标签（3点钟方向）
        const lx = cx + r + 10;
        const ly = cy;
        if (lx < canvas.width - 20 && lx > 0) {
          ctx.font = "700 10px 'JetBrains Mono',monospace";
          ctx.fillStyle = w.color;
          ctx.fillText(`${w.label}  ${w.km}km`, lx, ly - 3);
          ctx.font = "400 8px 'JetBrains Mono',monospace";
          ctx.fillStyle = `rgba(${rgb},0.5)`;
          ctx.fillText(w.sub, lx, ly + 9);
        }
      });

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeWeapons, viewerRef, cesiumRef, site]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 490,
      }}
    />
  );
}

// ══════════════════════════════════════════════════════════════
//  Tab 情报 — 身份 + ACI/DCI + 趋势 + 信实链
// ══════════════════════════════════════════════════════════════
function TabIntel({ site }) {
  const navigate = useNavigate();
  const [expandedEvent, setExpandedEvent] = useState(null);
  const related = EVENTS.filter((e) => e.siteId === site.id && e.verified);
  const sc = statusColor(site.status);
  const svTag =
    { S: "#ef4444", A: "#f59e0b" }[site.strategicValue] ?? "#22c55e";

  return (
    <div style={{ padding: "12px 14px" }}>
      {/* 身份卡 */}
      <div
        style={{
          padding: "10px 12px",
          background: "#060d1a",
          border: "1px solid #1a2d45",
          borderRadius: 4,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: sc,
                boxShadow: `0 0 7px ${sc}`,
                animation: "sPulse 2s ease-in-out infinite",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 10, color: sc, fontWeight: 600 }}>
              {statusLabel(site.status)}
            </span>
          </div>
          <span
            style={{
              padding: "2px 7px",
              borderRadius: 2,
              fontSize: 9,
              fontWeight: 700,
              background: `${svTag}1a`,
              border: `1px solid ${svTag}66`,
              color: svTag,
            }}
          >
            战略 {site.strategicValue} 级
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: 3,
          }}
        >
          {site.name}
        </div>
        <div style={{ fontSize: 9, color: "#475569" }}>
          {site.country} · {site.type}
        </div>
        <div
          style={{
            fontSize: 8,
            color: "#1e3a5f",
            marginTop: 2,
            fontFamily: "JetBrains Mono",
          }}
        >
          {site.lat?.toFixed(4)}°N &nbsp; {site.lng?.toFixed(4)}°E
        </div>
      </div>

      {/* ACI / DCI */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 9,
            color: "#475569",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          核心能力指数
        </div>
        {[
          {
            key: "ACI",
            label: "攻击能力指数",
            val: site.aci,
            color: "#22c55e",
          },
          {
            key: "DCI",
            label: "防御能力指数",
            val: site.dci,
            color: "#0ea5e9",
          },
        ].map(({ key, label, val, color: c }) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  style={{
                    fontSize: 9,
                    color: c,
                    fontFamily: "JetBrains Mono",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}
                >
                  {key}
                </span>
                <span style={{ fontSize: 8, color: "#334155" }}>{label}</span>
              </div>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: c,
                  fontFamily: "JetBrains Mono",
                  lineHeight: 1,
                }}
              >
                {val}
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: "#0a1628",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${val}%`,
                  height: "100%",
                  borderRadius: 2,
                  background: `linear-gradient(90deg,${c}55,${c})`,
                  boxShadow: `0 0 8px ${c}44`,
                  transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 7日趋势 */}
      {site.dailyData && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 9,
              color: "#475569",
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}
          >
            能力趋势 · 7日
          </div>
          <TrendChart dailyData={site.dailyData} />
        </div>
      )}

      {/* 信实链事件 */}
      {related.length > 0 && (
        <div style={{ borderTop: "1px solid #0f1e30", paddingTop: 12 }}>
          <div
            style={{
              fontSize: 9,
              color: "#475569",
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            信实链关联事件 · {related.length} 条
          </div>
          {related.map((e) => {
            const isExp = expandedEvent === e.id;
            return (
              <div
                key={e.id}
                style={{
                  marginBottom: 5,
                  background: "#060d1a",
                  border: "1px solid #1e3a5f",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 10px",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedEvent(isExp ? null : e.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#cbd5e1",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.label?.replace("\n", " ")}
                    </div>
                    <div
                      style={{ fontSize: 8, color: "#334155", marginTop: 2 }}
                    >
                      {e.date} · {e.source}
                    </div>
                  </div>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    style={{
                      flexShrink: 0,
                      marginLeft: 8,
                      transform: isExp ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  >
                    <polyline
                      points="1,3 5,7 9,3"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                {isExp && (
                  <div
                    style={{
                      padding: "0 10px 10px",
                      borderTop: "1px solid #0d1a2e",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: "#64748b",
                        lineHeight: 1.6,
                        marginTop: 8,
                        marginBottom: 8,
                      }}
                    >
                      {e.content ?? "暂无详细描述"}
                    </div>
                    <button
                      onClick={() => navigate("/chain")}
                      style={{
                        padding: "3px 10px",
                        fontSize: 9,
                        background: "#22c55e15",
                        border: "1px solid #22c55e44",
                        color: "#22c55e",
                        borderRadius: 2,
                        cursor: "pointer",
                      }}
                    >
                      → 信实链
                    </button>
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

// ══════════════════════════════════════════════════════════════
//  Tab 打击 — 雷达 + 五维条 + 作战半径
// ══════════════════════════════════════════════════════════════
function TabStrike({ site, activeWeapons, onWeaponsChange }) {
  const [hoveredDim, setHoveredDim] = useState(null);
  const color = scoreColor(site.combatScore ?? site.aci);
  const dims = [
    { key: "fire", label: "火力", val: site.combatScore ?? 70 },
    {
      key: "maneuver",
      label: "机动",
      val: Math.round((site.combatScore ?? 70) * 0.85),
    },
    {
      key: "air",
      label: "防空",
      val: Math.round((site.combatScore ?? 70) * 0.72),
    },
    {
      key: "intel",
      label: "情报",
      val: Math.round((site.combatScore ?? 70) * 0.91),
    },
    {
      key: "logistics",
      label: "后勤",
      val: Math.round((site.combatScore ?? 70) * 0.78),
    },
  ];

  const toggleWeapon = (id) =>
    onWeaponsChange(
      activeWeapons.includes(id)
        ? activeWeapons.filter((x) => x !== id)
        : [...activeWeapons, id],
    );

  return (
    <div style={{ padding: "12px 14px" }}>
      {/* 综合战力 + 五维横向条 */}
      <div
        style={{
          padding: "12px",
          background: "#060d1a",
          border: `1px solid ${color}33`,
          borderRadius: 4,
          marginBottom: 12,
          display: "flex",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              fontSize: 8,
              color: "#475569",
              letterSpacing: "0.08em",
              marginBottom: 2,
            }}
          >
            综合战力
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 800,
              color,
              fontFamily: "JetBrains Mono",
              lineHeight: 1,
              textShadow: `0 0 18px ${color}55`,
            }}
          >
            {site.combatScore ?? site.aci}
          </div>
        </div>
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}
        >
          {dims.map((d) => {
            const dc = scoreColor(d.val);
            const isH = hoveredDim === d.key;
            return (
              <div
                key={d.key}
                onMouseEnter={() => setHoveredDim(d.key)}
                onMouseLeave={() => setHoveredDim(null)}
                style={{ cursor: "default" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      color: isH ? "#e2e8f0" : "#475569",
                      transition: "color 0.15s",
                    }}
                  >
                    {d.label}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: dc,
                      fontFamily: "JetBrains Mono",
                      fontWeight: 700,
                    }}
                  >
                    {d.val}
                  </span>
                </div>
                <div
                  style={{
                    height: isH ? 4 : 3,
                    background: "#0a1628",
                    borderRadius: 2,
                    transition: "height 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: `${d.val}%`,
                      height: "100%",
                      background: `linear-gradient(90deg,${dc}55,${dc})`,
                      borderRadius: 2,
                      boxShadow: isH ? `0 0 6px ${dc}88` : "none",
                      transition: "all 0.15s",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 雷达图（与五维 hover 联动） */}
      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}
      >
        <RadarChart
          dims={dims}
          color={color}
          hoveredDim={hoveredDim}
          onHover={setHoveredDim}
        />
      </div>

      {/* 作战半径 */}
      <div style={{ borderTop: "1px solid #0f1e30", paddingTop: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div
            style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}
          >
            作战半径 · 威胁圈
          </div>
          {activeWeapons.length > 0 && (
            <button
              onClick={() => onWeaponsChange([])}
              style={{
                fontSize: 8,
                color: "#334155",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px 5px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
            >
              全部清除
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {WEAPON_PRESETS.map((w) => {
            const active = activeWeapons.includes(w.id);
            return (
              <button
                key={w.id}
                onClick={() => toggleWeapon(w.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  background: active ? `rgba(${w.heatColor},0.09)` : "#060d1a",
                  border: `1px solid ${active ? w.color + "77" : "#1a2d45"}`,
                  borderRadius: 3,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                {/* 武器环形指示 */}
                <div
                  style={{
                    position: "relative",
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    style={{ position: "absolute" }}
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke={active ? w.color + "44" : "#1e3a5f"}
                      strokeWidth="1"
                    />
                    {active && (
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke={w.color}
                        strokeWidth="1.5"
                        strokeDasharray={`${62.8 * Math.min(w.km / 800, 1)} ${62.8}`}
                        strokeLinecap="round"
                        style={{
                          transformOrigin: "center",
                          transform: "rotate(-90deg)",
                          animation: "spinDash 5s linear infinite",
                        }}
                      />
                    )}
                  </svg>
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: active ? w.color : "#1e3a5f",
                      boxShadow: active ? `0 0 6px ${w.color}` : "none",
                      transition: "all 0.2s",
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 6 }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: active ? w.color : "#64748b",
                        transition: "color 0.2s",
                      }}
                    >
                      {w.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: active ? `rgba(${w.heatColor},0.75)` : "#334155",
                        fontFamily: "JetBrains Mono",
                        fontWeight: 600,
                      }}
                    >
                      {w.km} km
                    </span>
                  </div>
                  <div style={{ fontSize: 8, color: "#334155", marginTop: 1 }}>
                    {w.sub}
                  </div>
                </div>

                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: active ? w.color : "transparent",
                    boxShadow: active ? `0 0 8px ${w.color}` : "none",
                    transition: "all 0.2s",
                    animation: active
                      ? "activeDot 1.6s ease-in-out infinite"
                      : "none",
                  }}
                />
              </button>
            );
          })}
        </div>

        {activeWeapons.length > 0 && (
          <div
            style={{
              marginTop: 8,
              padding: "6px 10px",
              background: "#040c18",
              border: "1px solid #0f1e30",
              borderRadius: 3,
              fontSize: 8,
              color: "#334155",
              lineHeight: 1.7,
            }}
          >
            ◉ {activeWeapons.length} 个威胁圈已投影至地图
            <br />
            热力渐变 · 旋转虚线边界 · 扩散波纹持续刷新
          </div>
        )}
      </div>

      <style>{`
        @keyframes spinDash { to { stroke-dashoffset: -62.8; } }
        @keyframes activeDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(1.7)} }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  Tab 损毁 — 概览数字 + 设施列表 + 影像时间轴
// ══════════════════════════════════════════════════════════════
function TabDamage({ site, timeline, imgIdx, onImgSelect, activeImg }) {
  const color = scoreColor(site.combatScore ?? site.aci);
  const activeImgScore = activeImg?.score ?? 0.85;
  const activeImgDate = activeImg?.create_time
    ? activeImg.create_time.split(" ")[0]
    : (activeImg?.date ?? "");
  const activeImgDesc = activeImg?.desc ?? "—";
  const avgDamage = site.facilities?.length
    ? Math.round(
        site.facilities.reduce((s, f) => s + (f.damage ?? 0), 0) /
          site.facilities.length,
      )
    : 0;
  const dmgColor =
    avgDamage > 60 ? "#ef4444" : avgDamage > 20 ? "#f59e0b" : "#22c55e";

  return (
    <div style={{ padding: "12px 14px" }}>
      {/* 概览三格 */}
      <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
        {[
          { label: "平均损毁", val: `${avgDamage}%`, color: dmgColor },
          {
            label: "卫星验证",
            val: `${site.facilities?.filter((f) => f.verified).length ?? 0}/${site.facilities?.length ?? 0}`,
            color: "#0ea5e9",
          },
          {
            label: "影像置信",
            val: `${Math.round(activeImgScore * 100)}%`,
            color,
          },
        ].map(({ label, val, color: c }) => (
          <div
            key={label}
            style={{
              flex: 1,
              padding: "9px 10px",
              background: "#060d1a",
              border: `1px solid ${c}2a`,
              borderRadius: 4,
            }}
          >
            <div
              style={{
                fontSize: 7,
                color: "#475569",
                letterSpacing: "0.08em",
                marginBottom: 3,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: c,
                fontFamily: "JetBrains Mono",
                lineHeight: 1,
              }}
            >
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* 设施损毁 */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 9,
            color: "#475569",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          设施状态
        </div>
        {(site.facilities ?? []).map((f, i) => {
          const fc =
            f.damage > 60 ? "#ef4444" : f.damage > 20 ? "#f59e0b" : "#22c55e";
          return (
            <div key={i} style={{ marginBottom: 9 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 8,
                      color: f.verified ? "#22c55e" : "#334155",
                    }}
                  >
                    {f.verified ? "✓" : "◌"}
                  </span>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>
                    {f.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: fc,
                    fontFamily: "JetBrains Mono",
                  }}
                >
                  {f.damage > 0 ? `${f.damage}%` : "完好"}
                </span>
              </div>
              <div
                style={{ height: 4, background: "#0a1628", borderRadius: 2 }}
              >
                <div
                  style={{
                    width: `${f.damage}%`,
                    height: "100%",
                    borderRadius: 2,
                    background: `linear-gradient(90deg,${fc}55,${fc})`,
                    boxShadow: f.damage > 0 ? `0 0 5px ${fc}55` : "none",
                    transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 影像时间轴（纵向） */}
      <div style={{ borderTop: "1px solid #0f1e30", paddingTop: 12 }}>
        <div
          style={{
            fontSize: 9,
            color: "#475569",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          卫星影像档案
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {timeline.map((item, i) => {
            const itemDate = item.create_time
              ? item.create_time.split(" ")[0]
              : item.date;
            const isActive = i === imgIdx;
            return (
              <div
                key={item.id ?? i}
                onClick={() => onImgSelect(i)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  padding: "8px 10px",
                  background: isActive ? `${color}0d` : "#060d1a",
                  border: `1px solid ${isActive ? color + "55" : "#0f1e30"}`,
                  borderRadius: 3,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flexShrink: 0,
                    paddingTop: 3,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: isActive ? color : "#1e3a5f",
                      boxShadow: isActive ? `0 0 6px ${color}` : "none",
                      transition: "all 0.15s",
                    }}
                  />
                  {i < timeline.length - 1 && (
                    <div
                      style={{
                        width: 1,
                        height: 18,
                        background: "#1a2d45",
                        marginTop: 3,
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "#e2e8f0" : "#64748b",
                        fontFamily: "JetBrains Mono",
                      }}
                    >
                      {itemDate}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          fontSize: 7,
                          color,
                          padding: "1px 5px",
                          border: `1px solid ${color}44`,
                          borderRadius: 2,
                        }}
                      >
                        当前
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: "#334155",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label ?? item.desc ?? `影像 #${item.image_id}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activeImgDesc && activeImgDesc !== "—" && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              background: "#040c18",
              border: "1px solid #1e3a5f",
              borderLeft: `2px solid ${color}55`,
              borderRadius: 3,
            }}
          >
            <div style={{ fontSize: 8, color: "#334155", marginBottom: 3 }}>
              AI 识别结果
            </div>
            <div style={{ fontSize: 9, color: "#64748b", lineHeight: 1.6 }}>
              {activeImgDesc}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 趋势图（面积填充） ─────────────────────────────────────────
function TrendChart({ dailyData }) {
  const { dates, aci, dci } = dailyData;
  const n = dates.length;
  const W = 268,
    H = 52;
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
          color: "#1e3a5f",
          marginBottom: 4,
        }}
      >
        <span>{dates[0]}</span>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ color: "#22c55e" }}>— ACI</span>
          <span style={{ color: "#0ea5e9" }}>— DCI</span>
        </div>
        <span>{dates[n - 1]}</span>
      </div>
      <svg
        width={W}
        height={H}
        style={{ overflow: "visible", display: "block" }}
      >
        <defs>
          <linearGradient id="gACI" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gDCI" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((r) => (
          <line
            key={r}
            x1={0}
            y1={H * (1 - r)}
            x2={W}
            y2={H * (1 - r)}
            stroke="#0a1628"
            strokeWidth={0.5}
          />
        ))}
        <path d={`${path(dci)} L${W},${H} L0,${H} Z`} fill="url(#gDCI)" />
        <path d={`${path(aci)} L${W},${H} L0,${H} Z`} fill="url(#gACI)" />
        <path d={path(dci)} fill="none" stroke="#0ea5e9" strokeWidth={1.5} />
        <path d={path(aci)} fill="none" stroke="#22c55e" strokeWidth={1.5} />
        <circle cx={W} cy={H - (aci[n - 1] / 100) * H} r={3} fill="#22c55e" />
        <circle cx={W} cy={H - (dci[n - 1] / 100) * H} r={3} fill="#0ea5e9" />
      </svg>
    </div>
  );
}

// ── 雷达图 ─────────────────────────────────────────────────────
function RadarChart({ dims, color, hoveredDim, onHover }) {
  const S = 148,
    cx = 74,
    cy = 74,
    r = 54;
  const angles = dims.map(
    (_, i) => (i / dims.length) * Math.PI * 2 - Math.PI / 2,
  );
  const pt = (ratio, i) => [
    cx + r * ratio * Math.cos(angles[i]),
    cy + r * ratio * Math.sin(angles[i]),
  ];
  return (
    <svg width={S} height={S} style={{ overflow: "visible" }}>
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
        points={dims.map((d, i) => pt(d.val / 100, i).join(",")).join(" ")}
        fill={`${color}18`}
        stroke={color}
        strokeWidth={1.5}
      />
      {dims.map((d, i) => {
        const isH = hoveredDim === d.key;
        const [px, py] = pt(d.val / 100, i);
        const [lx, ly] = pt(1.32, i);
        return (
          <g
            key={i}
            style={{ cursor: "default" }}
            onMouseEnter={() => onHover(d.key)}
            onMouseLeave={() => onHover(null)}
          >
            <circle
              cx={px}
              cy={py}
              r={isH ? 4.5 : 3}
              fill={isH ? color : `${color}88`}
              style={{ transition: "r 0.15s" }}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={isH ? 9 : 8}
              fill={isH ? "#e2e8f0" : "#475569"}
              fontFamily="JetBrains Mono"
              style={{ transition: "all 0.15s" }}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
//  SiteDetailPanel  主导出
// ══════════════════════════════════════════════════════════════
export default function SiteDetailPanel({
  site,
  timeline,
  imgIdx,
  onImgSelect,
  activeImg,
  activeWeapons,
  onWeaponsChange,
}) {
  const [tab, setTab] = useState("intel");

  useEffect(() => {
    setTab("intel");
  }, [site?.id]);

  if (!site) return null;
  const sc = statusColor(site.status);

  const TABS = [
    { id: "intel", label: "情报" },
    { id: "strike", label: "打击" },
    { id: "damage", label: "损毁" },
  ];

  return (
    <div
      style={{
        width: 314,
        flexShrink: 0,
        background: "#040810",
        borderLeft: "1px solid #1a2d45",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* 顶栏 */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid #1a2d45" }}>
        <div style={{ padding: "10px 14px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: sc,
                boxShadow: `0 0 6px ${sc}`,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#e2e8f0",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {site.name}
            </div>
            {activeWeapons.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 7px",
                  background: "#ef444415",
                  border: "1px solid #ef444433",
                  borderRadius: 10,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#ef4444",
                    animation: "sPulse 1.4s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: 8,
                    color: "#ef4444",
                    fontFamily: "JetBrains Mono",
                  }}
                >
                  {activeWeapons.length} 圈
                </span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", paddingLeft: 14 }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "7px 18px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? "#0ea5e9" : "transparent"}`,
                  color: active ? "#0ea5e9" : "#475569",
                  fontSize: 10,
                  fontWeight: active ? 700 : 400,
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "intel" && <TabIntel site={site} />}
        {tab === "strike" && (
          <TabStrike
            site={site}
            activeWeapons={activeWeapons}
            onWeaponsChange={onWeaponsChange}
          />
        )}
        {tab === "damage" && (
          <TabDamage
            site={site}
            timeline={timeline}
            imgIdx={imgIdx}
            onImgSelect={onImgSelect}
            activeImg={activeImg}
          />
        )}
      </div>
    </div>
  );
}
