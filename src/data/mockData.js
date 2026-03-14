// ============================================================
//  SATINT Demo — Shared Mock Data
//  All three modules draw from this single source of truth.
// ============================================================

// ── 事件节点 ─────────────────────────────────────────────────
// score: 0~1  (0=红/不可信  1=绿/卫星验证)
// verified: true = 已通过卫星影像验证，可跳转点位包
export const EVENTS = [
  // 链 A：空袭行动链
  {
    id: "A1",
    label: "F-16编队离场\n塔尔阿夫尔基地",
    chain: "A",
    score: 0.95,
    verified: true,
    siteId: "S1",
    source: "OpenSky轨迹",
    date: "2025-11-03 06:12",
    detail: "OpenSky记录4架F-16于06:12从塔尔阿夫尔基地起飞，航向270°。",
  },
  {
    id: "A2",
    label: "侦察机\n进入目标区",
    chain: "A",
    score: 0.88,
    verified: true,
    siteId: "S2",
    source: "OpenSky轨迹",
    date: "2025-11-03 06:41",
    detail: "RC-135侦察机在目标区域盘旋40分钟，疑似引导打击。",
  },
  {
    id: "A3",
    label: "胡拉玛基地\n爆炸声报道",
    chain: "A",
    score: 0.55,
    verified: false,
    siteId: null,
    source: "社交媒体",
    date: "2025-11-03 07:15",
    detail: "多个当地账号发布爆炸声音频，尚未核实。",
  },
  {
    id: "A4",
    label: "卫星影像确认\n设施受损",
    chain: "A",
    score: 0.97,
    verified: true,
    siteId: "S3",
    source: "卫星存档验证",
    date: "2025-11-03 10:00",
    detail: "过境影像确认2号机库屋顶坍塌，跑道有弹坑×3。",
  },
  {
    id: "A5",
    label: "伤亡数字\n官方通报",
    chain: "A",
    score: 0.62,
    verified: false,
    siteId: null,
    source: "官方媒体",
    date: "2025-11-03 12:30",
    detail: "官方声称无人员伤亡，与社交媒体说法存在分歧。",
  },
  {
    id: "A6",
    label: "战斗机\n返回基地确认",
    chain: "A",
    score: 0.91,
    verified: true,
    siteId: "S1",
    source: "OpenSky轨迹",
    date: "2025-11-03 09:50",
    detail: "OpenSky记录F-16编队于09:50降落，与出发数量一致。",
  },

  // 链 B：舰队集结链
  {
    id: "B1",
    label: "航母编队\n波斯湾入口",
    chain: "B",
    score: 0.93,
    verified: true,
    siteId: "S4",
    source: "AIS船舶数据",
    date: "2025-11-01 14:00",
    detail: "AIS数据显示CVN-77及护卫舰群进入霍尔木兹海峡。",
  },
  {
    id: "B2",
    label: "岸基导弹\n阵地激活",
    chain: "B",
    score: 0.71,
    verified: true,
    siteId: "S5",
    source: "卫星存档验证",
    date: "2025-11-01 18:00",
    detail: "卫星影像显示反舰导弹发射车离开遮蔽棚。",
  },
  {
    id: "B3",
    label: "双方舰艇\n对峙报道",
    chain: "B",
    score: 0.45,
    verified: false,
    siteId: null,
    source: "路透社",
    date: "2025-11-01 20:15",
    detail: "路透社援引匿名消息，尚无影像证据。",
  },
  {
    id: "B4",
    label: "海峡通行\n恢复正常",
    chain: "B",
    score: 0.82,
    verified: true,
    siteId: "S4",
    source: "AIS船舶数据",
    date: "2025-11-02 08:00",
    detail: "AIS恢复正常民船通行记录，对峙解除。",
  },

  // 链 C：基地扩建链
  {
    id: "C1",
    label: "工程车辆\n进入基地",
    chain: "C",
    score: 0.88,
    verified: true,
    siteId: "S6",
    source: "卫星存档验证",
    date: "2025-10-15 00:00",
    detail: "连续3期影像显示重型工程机械驶入西侧区域。",
  },
  {
    id: "C2",
    label: "跑道延伸\n施工中",
    chain: "C",
    score: 0.92,
    verified: true,
    siteId: "S6",
    source: "卫星存档验证",
    date: "2025-10-28 00:00",
    detail: "跑道向北延伸约400m，可供重型轰炸机起降。",
  },
  {
    id: "C3",
    label: "新型雷达\n疑似部署",
    chain: "C",
    score: 0.6,
    verified: false,
    siteId: null,
    source: "开源论坛",
    date: "2025-11-01 00:00",
    detail: "网络图片显示大型雷达天线，真实性待核实。",
  },
  {
    id: "C4",
    label: "外国技术人员\n入境",
    chain: "C",
    score: 0.38,
    verified: false,
    siteId: null,
    source: "未具名线人",
    date: "2025-11-02 00:00",
    detail: "单一来源，可信度低，待交叉验证。",
  },
];

// ── 事件边（链内连接） ────────────────────────────────────────
export const EDGES = [
  { source: "A1", target: "A2" },
  { source: "A2", target: "A3" },
  { source: "A3", target: "A4" },
  { source: "A4", target: "A5" },
  { source: "A1", target: "A6" },
  { source: "A4", target: "A6" },
  { source: "B1", target: "B2" },
  { source: "B2", target: "B3" },
  { source: "B3", target: "B4" },
  { source: "C1", target: "C2" },
  { source: "C2", target: "C3" },
  { source: "C3", target: "C4" },
  // 跨链关联
  { source: "A1", target: "B1", crossChain: true },
  { source: "C2", target: "A1", crossChain: true },
];

// ── 军事基地 ─────────────────────────────────────────────────
export const SITES = [
  {
    id: "S1",
    name: "塔尔阿夫尔空军基地",
    lat: 36.679,
    lng: 42.447,
    country: "伊拉克",
    type: "空军基地",
    combatScore: 82,
    scoreHistory: [65, 68, 72, 70, 75, 78, 82],
    equipment: [
      { name: "F-16 Fighting Falcon", count: 12, change: "+2", verified: true },
      { name: "C-130 Hercules", count: 4, change: "0", verified: true },
      { name: "MQ-9 Reaper", count: 3, change: "+1", verified: false },
      { name: "SAM 阵地 (Patriot)", count: 2, change: "0", verified: true },
    ],
    imagery: [
      {
        date: "2025-11-03",
        label: "任务返回后",
        desc: "跑道正常，停机坪F-16 12架可见",
        score: 0.91,
      },
      {
        date: "2025-10-28",
        label: "任务前状态",
        desc: "停机坪F-16 10架，新增2架",
        score: 0.88,
      },
      {
        date: "2025-10-15",
        label: "基线状态",
        desc: "F-16 10架，C-130 4架，正常部署",
        score: 0.85,
      },
    ],
    status: "operational",
    strategicValue: "S",
    aci: 88,
    dci: 75,
    dailyData: {
      dates: ["10/28", "10/29", "10/30", "10/31", "11/01", "11/02", "11/03"],
      aci: [82, 83, 85, 86, 87, 88, 88],
      dci: [70, 71, 72, 73, 74, 75, 75],
    },
    facilities: [
      { name: "主跑道", damage: 0, verified: true },
      { name: "加固机库", damage: 0, verified: true },
      { name: "F-16停机坪", damage: 0, verified: true },
      { name: "SAM阵地", damage: 0, verified: true },
    ],
  },
  {
    id: "S2",
    name: "侦察机前进基地(代号)",
    lat: 35.1,
    lng: 43.9,
    country: "伊拉克",
    type: "前沿部署",
    combatScore: 55,
    scoreHistory: [40, 42, 48, 50, 53, 55, 55],
    equipment: [
      { name: "RC-135 侦察机", count: 1, change: "0", verified: true },
    ],
    imagery: [
      {
        date: "2025-11-03",
        label: "侦察任务中",
        desc: "RC-135在目标区上空",
        score: 0.88,
      },
    ],
    status: "operational",
    strategicValue: "B",
    aci: 40,
    dci: 30,
    dailyData: {
      dates: ["10/28", "10/29", "10/30", "10/31", "11/01", "11/02", "11/03"],
      aci: [38, 39, 40, 40, 40, 40, 40],
      dci: [28, 29, 30, 30, 30, 30, 30],
    },
    facilities: [
      { name: "临时跑道", damage: 0, verified: true },
      { name: "侦察设备区", damage: 0, verified: true },
    ],
  },
  {
    id: "S3",
    name: "胡拉玛军事设施",
    lat: 35.5,
    lng: 45.1,
    country: "伊朗边境区",
    type: "受打击目标",
    combatScore: 28,
    scoreHistory: [78, 78, 78, 78, 30, 28, 28],
    equipment: [
      { name: "机库 (2#已损毁)", count: 3, change: "-1", verified: true },
      { name: "跑道 (有弹坑)", count: 1, change: "受损", verified: true },
    ],
    imagery: [
      {
        date: "2025-11-03",
        label: "打击后",
        desc: "2号机库坍塌，跑道弹坑×3，车辆疏散",
        score: 0.97,
      },
      {
        date: "2025-10-31",
        label: "打击前",
        desc: "设施完整，车辆活动正常",
        score: 0.95,
      },
    ],
    status: "destroyed",
    strategicValue: "A",
    aci: 18,
    dci: 15,
    dailyData: {
      dates: ["10/28", "10/29", "10/30", "10/31", "11/01", "11/02", "11/03"],
      aci: [75, 76, 77, 77, 75, 20, 18],
      dci: [68, 68, 69, 70, 68, 18, 15],
    },
    facilities: [
      { name: "主机库(1#)", damage: 0, verified: true },
      { name: "机库(2#受损)", damage: 95, verified: true },
      { name: "主跑道", damage: 40, verified: true },
      { name: "指挥中心", damage: 60, verified: false },
    ],
  },
  {
    id: "S4",
    name: "霍尔木兹海峡监控区",
    lat: 26.6,
    lng: 56.4,
    country: "伊朗/阿曼",
    type: "海上监控点",
    combatScore: 70,
    scoreHistory: [55, 58, 62, 68, 70, 70, 70],
    equipment: [
      { name: "CVN-77 航母", count: 1, change: "+1", verified: true },
      { name: "提康德罗加级巡洋舰", count: 2, change: "+2", verified: true },
      { name: "阿利伯克级驱逐舰", count: 4, change: "+4", verified: false },
    ],
    imagery: [
      {
        date: "2025-11-02",
        label: "对峙解除",
        desc: "航母编队向东驶出，民船通行恢复",
        score: 0.82,
      },
      {
        date: "2025-11-01",
        label: "集结中",
        desc: "航母及护卫舰群在海峡口徘徊",
        score: 0.93,
      },
    ],
    status: "operational",
    strategicValue: "S",
    aci: 92,
    dci: 85,
    dailyData: {
      dates: ["10/28", "10/29", "10/30", "10/31", "11/01", "11/02", "11/03"],
      aci: [80, 82, 85, 88, 92, 92, 92],
      dci: [72, 74, 78, 82, 85, 85, 85],
    },
    facilities: [
      { name: "CVN-77 甲板", damage: 0, verified: true },
      { name: "护卫编队", damage: 0, verified: false },
    ],
  },
  {
    id: "S5",
    name: "岸基导弹阵地(代号)",
    lat: 27.1,
    lng: 56.9,
    country: "伊朗",
    type: "导弹阵地",
    combatScore: 65,
    scoreHistory: [60, 60, 62, 63, 65, 65, 65],
    equipment: [
      { name: "反舰导弹发射车", count: 6, change: "+6", verified: true },
    ],
    imagery: [
      {
        date: "2025-11-01",
        label: "激活状态",
        desc: "6辆导弹发射车驶离遮蔽棚，展开部署",
        score: 0.71,
      },
    ],
    status: "damaged",
    strategicValue: "A",
    aci: 55,
    dci: 70,
    dailyData: {
      dates: ["10/28", "10/29", "10/30", "10/31", "11/01", "11/02", "11/03"],
      aci: [50, 51, 52, 53, 55, 55, 55],
      dci: [62, 64, 65, 68, 70, 70, 70],
    },
    facilities: [
      { name: "发射车遮蔽棚", damage: 0, verified: true },
      { name: "雷达站", damage: 20, verified: false },
    ],
  },
  {
    id: "S6",
    name: "某扩建空军基地",
    lat: 33.2,
    lng: 44.3,
    country: "伊拉克",
    type: "扩建施工中",
    combatScore: 71,
    scoreHistory: [58, 60, 62, 65, 68, 70, 71],
    equipment: [
      { name: "跑道 (延伸中)", count: 1, change: "+400m", verified: true },
      { name: "重型工程机械", count: 8, change: "施工", verified: true },
      { name: "疑似新型雷达", count: 1, change: "待核实", verified: false },
    ],
    imagery: [
      {
        date: "2025-11-01",
        label: "当前状态",
        desc: "跑道北段延伸400m，雷达天线疑似安装",
        score: 0.88,
      },
      {
        date: "2025-10-28",
        label: "施工中期",
        desc: "跑道延伸200m，工程机械活跃",
        score: 0.92,
      },
      {
        date: "2025-10-15",
        label: "施工初期",
        desc: "西侧出现工程车辆，土方作业",
        score: 0.88,
      },
    ],
    status: "damaged",
    strategicValue: "A",
    aci: 62,
    dci: 58,
    dailyData: {
      dates: ["10/15", "10/20", "10/25", "10/28", "10/30", "11/01", "11/03"],
      aci: [50, 53, 55, 58, 60, 61, 62],
      dci: [48, 50, 52, 54, 56, 57, 58],
    },
    facilities: [
      { name: "跑道(延伸中)", damage: 0, verified: true },
      { name: "新型雷达阵地", damage: 0, verified: false },
      { name: "工程施工区", damage: 0, verified: true },
    ],
  },
];

// ── 报告/预测数据（模块三用） ─────────────────────────────────
export const REPORT = {
  title: "INTELLIGENCE PREDICTION REPORT",
  subtitle: "智能预测与打击链评估",
  generatedAt: "2026-03-12 11:24:08",
  confidence: 0.84,

  sources: [
    {
      label: "历史飞行轨迹",
      confidence: 0.86,
      verified: true,
      sourceType: "chain",
    },
    {
      label: "卫星影像复核",
      confidence: 0.91,
      verified: true,
      sourceType: "satellite",
    },
    {
      label: "OSINT 公开情报",
      confidence: 0.58,
      verified: false,
      sourceType: "osint",
    },
    {
      label: "前进基地活动记录",
      confidence: 0.72,
      verified: true,
      sourceType: "chain",
    },
  ],

  summary: `根据OpenSky飞行数据、卫星存档影像及多源开源情报综合分析：

2025年11月3日06:12，4架F-16战斗机从塔尔阿夫尔基地起飞，航向270°。结合RC-135侦察机同期在目标区域盘旋的记录，研判本次出动目的为对胡拉玛军事设施实施精确打击。

07:15社交媒体出现爆炸报道，10:00卫星过境影像**确认**2号机库坍塌、跑道弹坑×3，与打击时间窗口吻合，置信度97%。

结合塔尔阿夫尔基地战斗力评分上升趋势（+12分/近30天）、F-16数量增加至12架，以及伊朗霍尔木兹岸基导弹阵地同期激活，研判本次打击为系列行动的组成部分。

**预测**：根据F-16编队历史出动模式（间隔约22小时）及侦察机未撤离迹象，预判明日05:30将有第二波出动，目标为设施B（坐标34.8°N / 46.2°E）。`,

  predictions: [
    {
      time: "明日 05:30",
      label: "设施B再次出击风险升高",
      confidence: 0.81,
    },
    {
      time: "明日 06:00",
      label: "目标区进入结果验证阶段",
      confidence: 0.69,
    },
  ],

  // Agent 推理卡片
  agentReasoning: [
    {
      label: "当前判断",
      value: "再次出击概率高",
      color: "#8b5cf6",
    },
    {
      label: "主要依据",
      value: "历史航迹 + 卫星验证 + OSINT 聚合",
      color: "#0ea5e9",
    },
    {
      label: "推理状态",
      value: "已形成可执行预测",
      color: "#22c55e",
    },
  ],

  // 置信度来源拆解
  confidenceBreakdown: [
    { label: "飞行轨迹证据", score: 0.24, color: "#f59e0b" },
    { label: "卫星验证加权", score: 0.31, color: "#22c55e" },
    { label: "OSINT 关联补强", score: 0.12, color: "#0ea5e9" },
    { label: "信实链传播提升", score: 0.17, color: "#8b5cf6" },
  ],

  // Agent 建议动作
  agentSuggestions: [
    "建议在明日03:30前触发一次卫星复核任务",
    "建议重点关注设施B周边车辆与热源活动",
    "建议同步复查前进基地相关链上节点变化",
  ],

  // 风险时间窗
  predictionTimeline: [
    { time: "05:10", label: "离场准备", level: "medium", color: "#f59e0b" },
    { time: "05:30", label: "高风险出击窗口", level: "high", color: "#ef4444" },
    { time: "05:50", label: "目标接近阶段", level: "high", color: "#8b5cf6" },
    { time: "06:10", label: "结果验证阶段", level: "medium", color: "#0ea5e9" },
  ],

  // 候选目标榜
  targetCandidates: [
    { name: "设施B", confidence: 0.81, color: "#8b5cf6" },
    { name: "跑道延伸区", confidence: 0.63, color: "#f59e0b" },
    { name: "雷达阵地", confidence: 0.57, color: "#0ea5e9" },
  ],

  feedbackResult: {
    confidence: 0.88,

    agentReasoning: [
      {
        label: '当前判断',
        value: '再次出击概率进一步升高',
        color: '#8b5cf6',
      },
      {
        label: '主要依据',
        value: '新增卫星复核 + 地面活动异常 + 链上节点更新',
        color: '#0ea5e9',
      },
      {
        label: '推理状态',
        value: '已接收验证反馈',
        color: '#22c55e',
      },
    ],

    confidenceBreakdown: [
      { label: '飞行轨迹证据', score: 0.24, color: '#f59e0b' },
      { label: '卫星验证加权', score: 0.35, color: '#22c55e' },
      { label: 'OSINT 关联补强', score: 0.11, color: '#0ea5e9' },
      { label: '信实链传播提升', score: 0.18, color: '#8b5cf6' },
    ],

    predictions: [
      {
        time: '明日 05:30',
        label: '设施B再次出击风险显著升高',
        confidence: 0.84,
      },
      {
        time: '明日 05:50',
        label: '目标区进入重点验证窗口',
        confidence: 0.76,
      },
    ],

    predictionTimeline: [
      { time: '05:18', label: '离场准备', level: 'medium', color: '#f59e0b' },
      { time: '05:30', label: '高风险出击窗口', level: 'high', color: '#ef4444' },
      { time: '05:46', label: '目标接近阶段', level: 'high', color: '#8b5cf6' },
      { time: '06:02', label: '结果验证阶段', level: 'medium', color: '#0ea5e9' },
    ],

    targetCandidates: [
      { name: '设施B', confidence: 0.84, color: '#8b5cf6' },
      { name: '跑道延伸区', confidence: 0.59, color: '#f59e0b' },
      { name: '雷达阵地', confidence: 0.52, color: '#0ea5e9' },
    ],

    agentSuggestions: [
      '建议将设施B列为下一轮卫星复核最高优先级',
      '建议缩小监测窗口至 05:20–06:05',
      '建议同步回查目标区周边新增链上关联节点',
    ],
  },
};

// ── 链级加权可信度计算 ────────────────────────────────────────
export function chainScore(chainId) {
  const nodes = EVENTS.filter((e) => e.chain === chainId);
  if (!nodes.length) return 0;
  const verified = nodes.filter((e) => e.verified);
  const baseAvg = nodes.reduce((s, e) => s + e.score, 0) / nodes.length;
  const verifiedBonus = (verified.length / nodes.length) * 0.1;
  return Math.min(1, baseAvg + verifiedBonus);
}

export const CHAINS = [
  {
    id: "A",
    name: "空袭行动链",
    description: "塔尔阿夫尔F-16出动 → 胡拉玛设施打击验证",
  },
  {
    id: "B",
    name: "舰队集结链",
    description: "CVN-77入波斯湾 → 岸基导弹激活 → 对峙解除",
  },
  {
    id: "C",
    name: "基地扩建链",
    description: "跑道延伸施工 → 新型雷达疑似部署",
  },
];

// ── 世界模拟 v2：基于F-16打击事件的多角色推演 ─────────────────────────────
// 以信实链已验证的"以色列F-16打击伊斯法罕"为种子，给不同角色注入独立视角prompt，
// 推演各方行动，生成的虚拟节点（dashed）代表预测的未来行动/后果。

// 种子节点（来自信实链，已验证，实线）
export const SIM_SEED_NODES = [
  { id: 'SN0', label: 'F-16 打击行动', sublabel: '信实链节点 #7 · 已验证',
    type: 'seed_event',
    desc: '11月03日 06:12 UTC | 以色列F-16I编队对伊朗伊斯法罕革命卫队核相关设施实施4波次精准打击。卫星热成像确认3处爆炸中心，建筑群损毁率约70%。' },
  { id: 'SN1', label: '以色列空军 F-16I', sublabel: '内盖夫拉蒙基地起飞',
    type: 'seed_actor',
    desc: '4架F-16I战斗机，由以色列内盖夫沙漠拉蒙空军基地起飞，经约旦领空渗透，任务代号不明。' },
  { id: 'SN2', label: '伊斯法罕核设施', sublabel: '革命卫队研究基地',
    type: 'seed_location',
    desc: '伊朗革命卫队伊斯法罕核相关研究设施，卫星热成像确认建筑北翼完全摧毁，地下设施入口被掩埋。' },
]

export const SIM_SEED_EDGES = [
  { id: 'SE1', source: 'SN1', target: 'SN0', label: '执行打击', virtual: false },
  { id: 'SE2', source: 'SN0', target: 'SN2', label: '命中目标', virtual: false },
]

// 8个模拟角色（各持独立视角/立场/prompt）
export const SIM_AGENTS = [
  { id: 'AG1', name: '美国五角大楼', shortName: '五角大楼', role: '战略决策', type: 'us_mil', color: '#3b82f6', seedLink: 'SN0',
    persona: '美国国防部高级战略顾问，评估中东打击事件的战略影响，权衡戒备升级必要性，首要目标是避免与伊朗全面冲突。' },
  { id: 'AG2', name: '美军基地指挥官', shortName: '基地指挥官', role: '战术指挥', type: 'us_mil', color: '#60a5fa', seedLink: 'SN1',
    persona: '美国中东前进基地指挥官，协调打击行动后勤支持，接收飞行员任务报告，准备向五角大楼提交战场评估报告。' },
  { id: 'AG3', name: '执行飞行员', shortName: '飞行员', role: '任务执行', type: 'us_mil', color: '#93c5fd', seedLink: 'SN1',
    persona: '以色列空军F-16I飞行员，刚完成高风险打击任务返航，正在进行任务复盘，经历肾上腺素消退后的冷静状态。' },
  { id: 'AG4', name: '伊朗军方总部', shortName: '伊朗军方', role: '对抗指挥', type: 'iran_mil', color: '#ef4444', seedLink: 'SN2',
    persona: '伊朗伊斯兰革命卫队最高指挥部，第一反应是震怒与报复冲动，同时冷静评估损失规模，权衡报复时机与方式。' },
  { id: 'AG5', name: '伊朗现场指挥官', shortName: '现场指挥官', role: '损毁评估', type: 'iran_mil', color: '#f87171', seedLink: 'SN2',
    persona: '伊斯法罕设施附近革命卫队地区指挥官，正在混乱中组织救援，实时向总部上报人员伤亡和设施损毁情况。' },
  { id: 'AG6', name: '伊朗防空阵地', shortName: '防空阵地', role: '防御分析', type: 'iran_mil', color: '#fca5a5', seedLink: 'SN0',
    persona: '伊朗S-300防空系统操作员，打击时未能有效拦截，正在紧急分析雷达回波数据，寻找以军飞行路径漏洞。' },
  { id: 'AG7', name: '军事情报机构', shortName: '情报机构', role: '情报分析', type: 'intel', color: '#22c55e', seedLink: 'SN0',
    persona: '美国中情局中东分析小组，综合卫星图像、信号情报和人源情报，独立评估打击效果，预判伊朗48h内可能反应。' },
  { id: 'AG8', name: '国际媒体', shortName: '媒体', role: '信息扩散', type: 'media', color: '#a78bfa', seedLink: 'SN0',
    persona: '国际媒体驻中东特派记者网络，正在核实多方消息源，准备发布打击事件独家报道，关注伤亡数字和国际社会反应。' },
]

// 3轮模拟，每轮各角色生成虚拟节点（dashed，代表预测的未来行动）
export const SIM_ROUNDS = [
  {
    round: 1, label: '即时反应', timeOffset: 'T+0~2h',
    desc: '各方收到打击消息后的第一波行动',
    nodes: [
      { id: 'VN1_1', agentId: 'AG1', label: '五角大楼启动危机评估',
        desc: '"任务效果超出预期。建议保持克制，不主动升级。派遣驱逐舰至波斯湾出口释放威慑信号。"', type: 'assessment' },
      { id: 'VN1_2', agentId: 'AG3', label: '飞行员提交任务报告',
        desc: '"所有目标命中，无损失。北翼完全摧毁，南翼部分损毁。全程未遭遇防空拦截，已安全返航。"', type: 'report' },
      { id: 'VN1_3', agentId: 'AG4', label: '伊朗军方召开紧急战情室',
        desc: '"立即评估损失，激活报复预案B。不公开承认遭受打击，通过代理渠道传递明确警告信号。"', type: 'command' },
      { id: 'VN1_4', agentId: 'AG5', label: '现场损毁评估完成',
        desc: '"北翼完全摧毁，12名研究人员伤亡，地下设施入口被掩埋。救援受阻，需24h清理完毕。"', type: 'report' },
      { id: 'VN1_5', agentId: 'AG7', label: '情报机构卫星复查',
        desc: '"热成像确认3处爆炸中心，倒塌率约70%。核材料储存区初步判断未受影响。"', type: 'intel' },
      { id: 'VN1_6', agentId: 'AG8', label: '媒体首波报道发布',
        desc: '"目击者报告伊斯法罕附近多次爆炸。伊朗官方暂无回应，以色列军方拒绝置评。"', type: 'media' },
    ],
    edges: [
      { id: 'VE1_1', source: 'AG1', target: 'VN1_1', virtual: true },
      { id: 'VE1_2', source: 'AG3', target: 'VN1_2', virtual: true },
      { id: 'VE1_3', source: 'AG4', target: 'VN1_3', virtual: true },
      { id: 'VE1_4', source: 'AG5', target: 'VN1_4', virtual: true },
      { id: 'VE1_5', source: 'AG7', target: 'VN1_5', virtual: true },
      { id: 'VE1_6', source: 'AG8', target: 'VN1_6', virtual: true },
    ],
  },
  {
    round: 2, label: '次级响应', timeOffset: 'T+2~12h',
    desc: '基于第一波反应的连锁行动',
    nodes: [
      { id: 'VN2_1', agentId: 'AG1', label: '美军戒备等级升级',
        desc: '"CVN-77航母战斗群前出至霍尔木兹海峡，驻伊拉克美军提升至DEFCON 3级战备。"', type: 'command' },
      { id: 'VN2_2', agentId: 'AG2', label: '基地人员撤离协调',
        desc: '"鉴于报复威胁，前线人员轮换方案启动，关键设施进入加固状态，24h战备值班制。"', type: 'action' },
      { id: 'VN2_3', agentId: 'AG4', label: '最高领袖批准报复预案',
        desc: '"批准代理人骚扰方案：控制规模，展示意志，严禁引发全面战争。"', type: 'command' },
      { id: 'VN2_4', agentId: 'AG6', label: '防空系统紧急升级方案',
        desc: '"飞行路径利用西北走廊雷达盲区。建议72h内完成3个机动雷达站前沿部署。"', type: 'defense' },
      { id: 'VN2_5', agentId: 'AG7', label: '伊朗反应预测报告',
        desc: '"预测：70%代理人骚扰，20%无人机直接报复，10%外交降级。置信度 0.82。"', type: 'intel' },
      { id: 'VN2_6', agentId: 'AG8', label: '国际舆论全面发酵',
        desc: '"多国召见大使，联合国要求紧急磋商。油价涨3.2%，黄金突破2400，全球市场震荡。"', type: 'media' },
    ],
    edges: [
      { id: 'VE2_1', source: 'VN1_1', target: 'VN2_1', virtual: true },
      { id: 'VE2_2', source: 'VN2_1', target: 'VN2_2', virtual: true },
      { id: 'VE2_3', source: 'VN1_3', target: 'VN2_3', virtual: true },
      { id: 'VE2_4', source: 'VN1_4', target: 'VN2_4', virtual: true },
      { id: 'VE2_5', source: 'VN1_5', target: 'VN2_5', virtual: true },
      { id: 'VE2_6', source: 'VN1_6', target: 'VN2_6', virtual: true },
    ],
  },
  {
    round: 3, label: '态势收敛', timeOffset: 'T+12~72h',
    desc: '多路径预测：升级 / 降级 / 僵持',
    nodes: [
      { id: 'VN3_1', agentId: 'AG4', label: '代理人骚扰行动',
        desc: '"真主党向以北部城镇发射火箭弹，伊拉克民兵袭击美军基地，报复意志展示但规模可控。"', type: 'escalation', probability: 0.70 },
      { id: 'VN3_2', agentId: 'AG1', label: '美国外交强力介入',
        desc: '"国务卿致电以国防部长要求暂停行动，向伊朗传递降级信号，避免代理人冲突升级为区域战争。"', type: 'diplomacy', probability: 0.65 },
      { id: 'VN3_3', agentId: 'AG4', label: '伊朗无人机直接报复',
        desc: '"革命卫队向以色列南部发射无人机群，铁穹拦截率约85%，造成有限损失。"', type: 'escalation', probability: 0.25 },
      { id: 'VN3_4', agentId: 'AG7', label: '伊朗核计划加速',
        desc: '"卫星显示纳坦兹设施活动增加，研判伊朗将以核计划加速作为战略报复手段。置信度 0.80。"', type: 'intel', probability: 0.80 },
    ],
    edges: [
      { id: 'VE3_1', source: 'VN2_3', target: 'VN3_1', virtual: true },
      { id: 'VE3_2', source: 'VN2_6', target: 'VN3_2', virtual: true },
      { id: 'VE3_3', source: 'VN2_3', target: 'VN3_3', virtual: true },
      { id: 'VE3_4', source: 'VN2_5', target: 'VN3_4', virtual: true },
    ],
  },
]

export const SIM_LOGS = [
  { time: '06:12:04', level: 'info',  round: 0, text: '载入信实链种子事件：F-16打击行动 [已验证] + 2个关联实体' },
  { time: '06:12:06', level: 'info',  round: 0, text: '初始化模拟角色：8个行为方就绪 | 知识图谱节点: 11' },
  { time: '06:12:08', level: 'info',  round: 1, text: '[轮次 1] AG1 [五角大楼] → 生成虚拟节点：危机评估会议' },
  { time: '06:12:09', level: 'info',  round: 1, text: '[轮次 1] AG3 [飞行员] → 生成虚拟节点：任务报告' },
  { time: '06:12:10', level: 'warn',  round: 1, text: '[轮次 1] AG4 [伊朗军方] → 生成虚拟节点：紧急战情室 ↑威胁' },
  { time: '06:12:11', level: 'info',  round: 1, text: '[轮次 1] AG5 [现场指挥官] → 生成虚拟节点：损毁评估' },
  { time: '06:12:12', level: 'info',  round: 1, text: '[轮次 1] AG7 [情报机构] → 生成虚拟节点：卫星复查' },
  { time: '06:12:13', level: 'info',  round: 1, text: '[轮次 1] AG8 [媒体] → 生成虚拟节点：首波报道' },
  { time: '06:12:14', level: 'info',  round: 1, text: '轮次 1 完成 · +6 虚拟节点 · 图谱规模: 17 节点' },
  { time: '06:12:17', level: 'info',  round: 2, text: '[轮次 2] AG1 [五角大楼] → 生成虚拟节点：戒备升级' },
  { time: '06:12:18', level: 'warn',  round: 2, text: '[轮次 2] AG4 [伊朗军方] → 生成虚拟节点：报复预案批准 ↑高风险' },
  { time: '06:12:19', level: 'info',  round: 2, text: '[轮次 2] AG2 [基地指挥官] → 生成虚拟节点：人员撤离' },
  { time: '06:12:20', level: 'info',  round: 2, text: '[轮次 2] AG6 [防空阵地] → 生成虚拟节点：防空升级方案' },
  { time: '06:12:22', level: 'info',  round: 2, text: '[轮次 2] AG7 [情报机构] → 生成虚拟节点：伊朗反应预测 P=0.82' },
  { time: '06:12:23', level: 'info',  round: 2, text: '[轮次 2] AG8 [媒体] → 生成虚拟节点：国际舆论发酵' },
  { time: '06:12:24', level: 'info',  round: 2, text: '轮次 2 完成 · +6 虚拟节点 · 图谱规模: 23 节点' },
  { time: '06:12:28', level: 'warn',  round: 3, text: '[轮次 3] AG4 [伊朗军方] → 代理人骚扰 (P=0.70)' },
  { time: '06:12:29', level: 'info',  round: 3, text: '[轮次 3] AG1 [五角大楼] → 外交介入 (P=0.65)' },
  { time: '06:12:30', level: 'error', round: 3, text: '[轮次 3] AG4 [伊朗军方] → 无人机直接报复 (P=0.25) 升级路径!' },
  { time: '06:12:31', level: 'warn',  round: 3, text: '[轮次 3] AG7 [情报机构] → 核计划加速 (P=0.80)' },
  { time: '06:12:33', level: 'info',  round: 3, text: '轮次 3 完成 · +4 虚拟节点 · 图谱规模: 27 节点' },
  { time: '06:12:35', level: 'info',  round: 3, text: '世界模拟完成 · 主路径：代理人冲突+外交降级并行 · 置信度 0.76' },
]

// ── 开源情报事件（OSINT）────────────────────────────────────────
// 置信度由大模型结合信实链数据库综合评分，坐标为模糊坐标（低精度）
export const OSINT_EVENTS = [
  {
    id: "O1",
    title: "社交媒体：胡拉玛附近爆炸声",
    content:
      "多名当地居民在推特上报告听到连续爆炸声，并观测到火光，方向为西北方向军事设施。",
    source: "Twitter · @IraqSecurity",
    sourceType: "social",
    date: "2025-11-02 23:41",
    lat: 35.49,
    lng: 45.05,
    confidence: 0.32,
    llmAnalysis:
      "信源为匿名社交账号，内容与A链已知打击时间高度吻合，但缺乏多源佐证，置信度偏低。",
    relatedChain: "A",
    relatedSiteId: "S3",
  },
  {
    id: "O2",
    title: "新闻报道：F-16战队目击",
    content:
      "路透社援引匿名官员称，多架F-16于当地时间凌晨起飞，目标不明，飞行方向朝伊朗边境。",
    source: "路透社",
    sourceType: "news",
    date: "2025-11-03 06:30",
    lat: 36.62,
    lng: 42.53,
    confidence: 0.61,
    llmAnalysis:
      "路透社信源可靠性较高，内容与A1节点卫星轨迹数据存在时间空间吻合，已纳入A链加权。",
    relatedChain: "A",
    relatedSiteId: "S1",
  },
  {
    id: "O3",
    title: "匿名电报：伊朗海军异动",
    content:
      "Telegram频道消息称霍尔木兹海峡附近发现异常海军集结，无法核实发布者身份。",
    source: "Telegram · 匿名频道",
    sourceType: "anonymous",
    date: "2025-11-01 14:20",
    lat: 26.55,
    lng: 56.28,
    confidence: 0.21,
    llmAnalysis:
      "信源完全匿名，内容可能与B链事件相关，但与已有AIS数据存在时间矛盾，置信度极低。",
    relatedChain: "B",
    relatedSiteId: "S4",
  },
  {
    id: "O4",
    title: "官方声明：伊拉克否认基地扩建",
    content:
      "伊拉克国防部发声明否认境内某空军基地存在跑道延伸施工，与卫星影像相矛盾。",
    source: "伊拉克国防部官网",
    sourceType: "official",
    date: "2025-10-29 10:00",
    lat: 33.12,
    lng: 43.72,
    confidence: 0.44,
    llmAnalysis:
      "官方否认声明与C链卫星验证影像内容直接矛盾，综合分析认为声明可信度低，列入反向信源。",
    relatedChain: "C",
    relatedSiteId: "S6",
  },
  {
    id: "O5",
    title: "开源论坛：导弹车目击报告",
    content:
      "多个军事观察论坛用户报告，在伊朗西海岸公路发现疑似导弹发射车车队移动。",
    source: "AirPower论坛 · r/MiddleEastConflict",
    sourceType: "social",
    date: "2025-11-02 18:05",
    lat: 27.22,
    lng: 56.05,
    confidence: 0.55,
    llmAnalysis:
      "多平台同源报告增强可信度，内容与B2节点激活记录时间一致，已辅助提升B链整体加权分。",
    relatedChain: "B",
    relatedSiteId: "S5",
  },
  {
    id: "O6",
    title: "新闻：卫星图显示新型雷达部署",
    content:
      "Planet Labs商业卫星图片被军事分析博主解读为新型远程雷达阵地，尚未得到官方证实。",
    source: "BellingCat分析",
    sourceType: "news",
    date: "2025-10-31 09:15",
    lat: 33.28,
    lng: 44.15,
    confidence: 0.73,
    llmAnalysis:
      "BellingCat方法论较为严谨，商业影像可信，内容与C链C3节点雷达部署吻合，置信度中高。",
    relatedChain: "C",
    relatedSiteId: "S6",
  },
  {
    id: "O7",
    title: "社交媒体：侦察机低空飞越",
    content:
      "多名民众拍摄到疑似无人侦察机在伊拉克北部低空飞行，视频在TikTok广泛传播。",
    source: "TikTok · 多用户",
    sourceType: "social",
    date: "2025-11-01 20:33",
    lat: 35.22,
    lng: 43.82,
    confidence: 0.48,
    llmAnalysis:
      "视频真实性难以验证，飞行特征与A2节点记录的侦察任务时间接近，已标记为弱关联参考。",
    relatedChain: "A",
    relatedSiteId: "S2",
  },
];
