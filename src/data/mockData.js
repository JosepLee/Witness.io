// ============================================================
//  SATINT Demo — Shared Mock Data
//  All three modules draw from this single source of truth.
// ============================================================

// ── 事件节点 ─────────────────────────────────────────────────
// score: 0~1  (0=红/不可信  1=绿/卫星验证)
// verified: true = 已通过卫星影像验证，可跳转点位包
export const EVENTS = [
  // 链 A：空袭行动链
  { id: 'A1', label: 'F-16编队离场\n塔尔阿夫尔基地', chain: 'A', score: 0.95, verified: true,  siteId: 'S1', source: 'OpenSky轨迹', date: '2025-11-03 06:12', detail: 'OpenSky记录4架F-16于06:12从塔尔阿夫尔基地起飞，航向270°。' },
  { id: 'A2', label: '侦察机\n进入目标区', chain: 'A', score: 0.88, verified: true,  siteId: 'S2', source: 'OpenSky轨迹', date: '2025-11-03 06:41', detail: 'RC-135侦察机在目标区域盘旋40分钟，疑似引导打击。' },
  { id: 'A3', label: '胡拉玛基地\n爆炸声报道', chain: 'A', score: 0.55, verified: false, siteId: null, source: '社交媒体', date: '2025-11-03 07:15', detail: '多个当地账号发布爆炸声音频，尚未核实。' },
  { id: 'A4', label: '卫星影像确认\n设施受损', chain: 'A', score: 0.97, verified: true,  siteId: 'S3', source: '卫星存档验证', date: '2025-11-03 10:00', detail: '过境影像确认2号机库屋顶坍塌，跑道有弹坑×3。' },
  { id: 'A5', label: '伤亡数字\n官方通报', chain: 'A', score: 0.62, verified: false, siteId: null, source: '官方媒体', date: '2025-11-03 12:30', detail: '官方声称无人员伤亡，与社交媒体说法存在分歧。' },
  { id: 'A6', label: '战斗机\n返回基地确认', chain: 'A', score: 0.91, verified: true,  siteId: 'S1', source: 'OpenSky轨迹', date: '2025-11-03 09:50', detail: 'OpenSky记录F-16编队于09:50降落，与出发数量一致。' },

  // 链 B：舰队集结链
  { id: 'B1', label: '航母编队\n波斯湾入口', chain: 'B', score: 0.93, verified: true,  siteId: 'S4', source: 'AIS船舶数据', date: '2025-11-01 14:00', detail: 'AIS数据显示CVN-77及护卫舰群进入霍尔木兹海峡。' },
  { id: 'B2', label: '岸基导弹\n阵地激活', chain: 'B', score: 0.71, verified: true,  siteId: 'S5', source: '卫星存档验证', date: '2025-11-01 18:00', detail: '卫星影像显示反舰导弹发射车离开遮蔽棚。' },
  { id: 'B3', label: '双方舰艇\n对峙报道', chain: 'B', score: 0.45, verified: false, siteId: null, source: '路透社', date: '2025-11-01 20:15', detail: '路透社援引匿名消息，尚无影像证据。' },
  { id: 'B4', label: '海峡通行\n恢复正常', chain: 'B', score: 0.82, verified: true,  siteId: 'S4', source: 'AIS船舶数据', date: '2025-11-02 08:00', detail: 'AIS恢复正常民船通行记录，对峙解除。' },

  // 链 C：基地扩建链
  { id: 'C1', label: '工程车辆\n进入基地', chain: 'C', score: 0.88, verified: true,  siteId: 'S6', source: '卫星存档验证', date: '2025-10-15 00:00', detail: '连续3期影像显示重型工程机械驶入西侧区域。' },
  { id: 'C2', label: '跑道延伸\n施工中', chain: 'C', score: 0.92, verified: true,  siteId: 'S6', source: '卫星存档验证', date: '2025-10-28 00:00', detail: '跑道向北延伸约400m，可供重型轰炸机起降。' },
  { id: 'C3', label: '新型雷达\n疑似部署', chain: 'C', score: 0.60, verified: false, siteId: null, source: '开源论坛', date: '2025-11-01 00:00', detail: '网络图片显示大型雷达天线，真实性待核实。' },
  { id: 'C4', label: '外国技术人员\n入境', chain: 'C', score: 0.38, verified: false, siteId: null, source: '未具名线人', date: '2025-11-02 00:00', detail: '单一来源，可信度低，待交叉验证。' },
]

// ── 事件边（链内连接） ────────────────────────────────────────
export const EDGES = [
  { source: 'A1', target: 'A2' },
  { source: 'A2', target: 'A3' },
  { source: 'A3', target: 'A4' },
  { source: 'A4', target: 'A5' },
  { source: 'A1', target: 'A6' },
  { source: 'A4', target: 'A6' },
  { source: 'B1', target: 'B2' },
  { source: 'B2', target: 'B3' },
  { source: 'B3', target: 'B4' },
  { source: 'C1', target: 'C2' },
  { source: 'C2', target: 'C3' },
  { source: 'C3', target: 'C4' },
  // 跨链关联
  { source: 'A1', target: 'B1', crossChain: true },
  { source: 'C2', target: 'A1', crossChain: true },
]

// ── 军事基地 ─────────────────────────────────────────────────
export const SITES = [
  {
    id: 'S1',
    name: '塔尔阿夫尔空军基地',
    lat: 36.679, lng: 42.447,
    country: '伊拉克',
    type: '空军基地',
    combatScore: 82,
    scoreHistory: [65, 68, 72, 70, 75, 78, 82],
    equipment: [
      { name: 'F-16 Fighting Falcon', count: 12, change: '+2', verified: true },
      { name: 'C-130 Hercules',       count: 4,  change: '0',  verified: true },
      { name: 'MQ-9 Reaper',          count: 3,  change: '+1', verified: false },
      { name: 'SAM 阵地 (Patriot)',   count: 2,  change: '0',  verified: true },
    ],
    imagery: [
      { date: '2025-11-03', label: '任务返回后', desc: '跑道正常，停机坪F-16 12架可见', score: 0.91 },
      { date: '2025-10-28', label: '任务前状态', desc: '停机坪F-16 10架，新增2架', score: 0.88 },
      { date: '2025-10-15', label: '基线状态',   desc: 'F-16 10架，C-130 4架，正常部署', score: 0.85 },
    ]
  },
  {
    id: 'S2',
    name: '侦察机前进基地(代号)',
    lat: 35.1, lng: 43.9,
    country: '伊拉克',
    type: '前沿部署',
    combatScore: 55,
    scoreHistory: [40, 42, 48, 50, 53, 55, 55],
    equipment: [
      { name: 'RC-135 侦察机', count: 1, change: '0', verified: true },
    ],
    imagery: [
      { date: '2025-11-03', label: '侦察任务中', desc: 'RC-135在目标区上空', score: 0.88 },
    ]
  },
  {
    id: 'S3',
    name: '胡拉玛军事设施',
    lat: 35.5, lng: 45.1,
    country: '伊朗边境区',
    type: '受打击目标',
    combatScore: 28,
    scoreHistory: [78, 78, 78, 78, 30, 28, 28],
    equipment: [
      { name: '机库 (2#已损毁)', count: 3, change: '-1', verified: true },
      { name: '跑道 (有弹坑)', count: 1, change: '受损', verified: true },
    ],
    imagery: [
      { date: '2025-11-03', label: '打击后', desc: '2号机库坍塌，跑道弹坑×3，车辆疏散', score: 0.97 },
      { date: '2025-10-31', label: '打击前', desc: '设施完整，车辆活动正常', score: 0.95 },
    ]
  },
  {
    id: 'S4',
    name: '霍尔木兹海峡监控区',
    lat: 26.6, lng: 56.4,
    country: '伊朗/阿曼',
    type: '海上监控点',
    combatScore: 70,
    scoreHistory: [55, 58, 62, 68, 70, 70, 70],
    equipment: [
      { name: 'CVN-77 航母', count: 1, change: '+1', verified: true },
      { name: '提康德罗加级巡洋舰', count: 2, change: '+2', verified: true },
      { name: '阿利伯克级驱逐舰', count: 4, change: '+4', verified: false },
    ],
    imagery: [
      { date: '2025-11-02', label: '对峙解除', desc: '航母编队向东驶出，民船通行恢复', score: 0.82 },
      { date: '2025-11-01', label: '集结中', desc: '航母及护卫舰群在海峡口徘徊', score: 0.93 },
    ]
  },
  {
    id: 'S5',
    name: '岸基导弹阵地(代号)',
    lat: 27.1, lng: 56.9,
    country: '伊朗',
    type: '导弹阵地',
    combatScore: 65,
    scoreHistory: [60, 60, 62, 63, 65, 65, 65],
    equipment: [
      { name: '反舰导弹发射车', count: 6, change: '+6', verified: true },
    ],
    imagery: [
      { date: '2025-11-01', label: '激活状态', desc: '6辆导弹发射车驶离遮蔽棚，展开部署', score: 0.71 },
    ]
  },
  {
    id: 'S6',
    name: '某扩建空军基地',
    lat: 33.2, lng: 44.3,
    country: '伊拉克',
    type: '扩建施工中',
    combatScore: 71,
    scoreHistory: [58, 60, 62, 65, 68, 70, 71],
    equipment: [
      { name: '跑道 (延伸中)', count: 1, change: '+400m', verified: true },
      { name: '重型工程机械', count: 8, change: '施工', verified: true },
      { name: '疑似新型雷达', count: 1, change: '待核实', verified: false },
    ],
    imagery: [
      { date: '2025-11-01', label: '当前状态', desc: '跑道北段延伸400m，雷达天线疑似安装', score: 0.88 },
      { date: '2025-10-28', label: '施工中期', desc: '跑道延伸200m，工程机械活跃', score: 0.92 },
      { date: '2025-10-15', label: '施工初期', desc: '西侧出现工程车辆，土方作业', score: 0.88 },
    ]
  }
]

// ── 报告/预测数据（模块三用） ─────────────────────────────────
export const REPORT = {
  title: '空中打击行动分析与未来预测',
  subtitle: '塔尔阿夫尔—胡拉玛打击链 · 自动生成报告',
  generatedAt: '2025-11-03 14:30 UTC',
  confidence: 0.84,
  // 过去事件时间线（用于地球演示）
  pastEvents: [
    { time: '06:12', type: 'aircraft', label: 'F-16×4离场', lat: 36.679, lng: 42.447, targetLat: 35.5, targetLng: 45.1 },
    { time: '06:41', type: 'recon',    label: '侦察机进入目标区', lat: 35.1, lng: 43.9 },
    { time: '07:15', type: 'event',    label: '目标区爆炸', lat: 35.5, lng: 45.1 },
    { time: '10:00', type: 'verify',   label: '卫星过境验证', lat: 35.5, lng: 45.1 },
    { time: '09:50', type: 'aircraft', label: 'F-16返回', lat: 36.679, lng: 42.447 },
  ],
  // 预测事件
  predictions: [
    { time: '明日 05:30', type: 'predict', label: '预测：F-16再次出击', lat: 36.679, lng: 42.447, targetLat: 34.8, targetLng: 46.2, confidence: 0.81 },
    { time: '明日 06:00', type: 'predict', label: '预测：打击设施B', lat: 34.8, lng: 46.2, confidence: 0.76 },
  ],
  sources: [
    { label: 'OpenSky 飞行轨迹数据', confidence: 0.95, verified: true },
    { label: '卫星存档影像 (过境#4872)', confidence: 0.97, verified: true },
    { label: '社交媒体爆炸报道', confidence: 0.55, verified: false },
    { label: '官方通报', confidence: 0.62, verified: false },
    { label: 'AIS 舰船动态', confidence: 0.93, verified: true },
  ],
  summary: `根据OpenSky飞行数据、卫星存档影像及多源开源情报综合分析：

2025年11月3日06:12，4架F-16战斗机从塔尔阿夫尔基地起飞，航向270°。结合RC-135侦察机同期在目标区域盘旋的记录，研判本次出动目的为对胡拉玛军事设施实施精确打击。

07:15社交媒体出现爆炸报道，10:00卫星过境影像**确认**2号机库坍塌、跑道弹坑×3，与打击时间窗口吻合，置信度97%。

结合塔尔阿夫尔基地战斗力评分上升趋势（+12分/近30天）、F-16数量增加至12架，以及伊朗霍尔木兹岸基导弹阵地同期激活，研判本次打击为系列行动的组成部分。

**预测**：根据F-16编队历史出动模式（间隔约22小时）及侦察机未撤离迹象，预判明日05:30将有第二波出动，目标为设施B（坐标34.8°N / 46.2°E）。`,
}

// ── 链级加权可信度计算 ────────────────────────────────────────
export function chainScore(chainId) {
  const nodes = EVENTS.filter(e => e.chain === chainId)
  if (!nodes.length) return 0
  const verified = nodes.filter(e => e.verified)
  const baseAvg = nodes.reduce((s, e) => s + e.score, 0) / nodes.length
  const verifiedBonus = verified.length / nodes.length * 0.1
  return Math.min(1, baseAvg + verifiedBonus)
}

export const CHAINS = [
  { id: 'A', name: '空袭行动链', description: '塔尔阿夫尔F-16出动 → 胡拉玛设施打击验证' },
  { id: 'B', name: '舰队集结链', description: 'CVN-77入波斯湾 → 岸基导弹激活 → 对峙解除' },
  { id: 'C', name: '基地扩建链', description: '跑道延伸施工 → 新型雷达疑似部署' },
]
