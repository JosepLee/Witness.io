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
    ],
    status: 'operational',
    strategicValue: 'S',
    aci: 88,
    dci: 75,
    dailyData: {
      dates: ['10/28','10/29','10/30','10/31','11/01','11/02','11/03'],
      aci:   [82, 83, 85, 86, 87, 88, 88],
      dci:   [70, 71, 72, 73, 74, 75, 75],
    },
    facilities: [
      { name: '主跑道',     damage: 0,  verified: true  },
      { name: '加固机库',   damage: 0,  verified: true  },
      { name: 'F-16停机坪', damage: 0,  verified: true  },
      { name: 'SAM阵地',    damage: 0,  verified: true  },
    ],
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
    ],
    status: 'operational',
    strategicValue: 'B',
    aci: 40,
    dci: 30,
    dailyData: {
      dates: ['10/28','10/29','10/30','10/31','11/01','11/02','11/03'],
      aci:   [38, 39, 40, 40, 40, 40, 40],
      dci:   [28, 29, 30, 30, 30, 30, 30],
    },
    facilities: [
      { name: '临时跑道',   damage: 0, verified: true  },
      { name: '侦察设备区', damage: 0, verified: true  },
    ],
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
    ],
    status: 'destroyed',
    strategicValue: 'A',
    aci: 18,
    dci: 15,
    dailyData: {
      dates: ['10/28','10/29','10/30','10/31','11/01','11/02','11/03'],
      aci:   [75, 76, 77, 77, 75, 20, 18],
      dci:   [68, 68, 69, 70, 68, 18, 15],
    },
    facilities: [
      { name: '主机库(1#)',    damage: 0,  verified: true  },
      { name: '机库(2#受损)',  damage: 95, verified: true  },
      { name: '主跑道',        damage: 40, verified: true  },
      { name: '指挥中心',      damage: 60, verified: false },
    ],
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
    ],
    status: 'operational',
    strategicValue: 'S',
    aci: 92,
    dci: 85,
    dailyData: {
      dates: ['10/28','10/29','10/30','10/31','11/01','11/02','11/03'],
      aci:   [80, 82, 85, 88, 92, 92, 92],
      dci:   [72, 74, 78, 82, 85, 85, 85],
    },
    facilities: [
      { name: 'CVN-77 甲板', damage: 0, verified: true  },
      { name: '护卫编队',    damage: 0, verified: false },
    ],
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
    ],
    status: 'damaged',
    strategicValue: 'A',
    aci: 55,
    dci: 70,
    dailyData: {
      dates: ['10/28','10/29','10/30','10/31','11/01','11/02','11/03'],
      aci:   [50, 51, 52, 53, 55, 55, 55],
      dci:   [62, 64, 65, 68, 70, 70, 70],
    },
    facilities: [
      { name: '发射车遮蔽棚', damage: 0,  verified: true  },
      { name: '雷达站',       damage: 20, verified: false },
    ],
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
    ],
    status: 'damaged',
    strategicValue: 'A',
    aci: 62,
    dci: 58,
    dailyData: {
      dates: ['10/15','10/20','10/25','10/28','10/30','11/01','11/03'],
      aci:   [50, 53, 55, 58, 60, 61, 62],
      dci:   [48, 50, 52, 54, 56, 57, 58],
    },
    facilities: [
      { name: '跑道(延伸中)',  damage: 0, verified: true  },
      { name: '新型雷达阵地',  damage: 0, verified: false },
      { name: '工程施工区',    damage: 0, verified: true  },
    ],
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
    { label: 'OpenSky 飞行轨迹数据',      confidence: 0.95, verified: true,  sourceType: 'satellite' },
    { label: '卫星存档影像 (过境#4872)',  confidence: 0.97, verified: true,  sourceType: 'satellite' },
    { label: '社交媒体爆炸报道',           confidence: 0.55, verified: false, sourceType: 'osint'     },
    { label: '官方通报',                   confidence: 0.62, verified: false, sourceType: 'osint'     },
    { label: 'AIS 舰船动态',              confidence: 0.93, verified: true,  sourceType: 'chain'     },
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

// ── 世界模拟数据 ────────────────────────────────────────────────
// 以信实链验证事件为种子，构建行为方网络，推演未来地缘态势
export const SIM_AGENTS = [
  { id: 'AG1', name: '以色列空军',     role: '攻势方', type: 'military',      status: 'active',      threat: 0.92,
    summary: 'F-16编队保持高战备，已执行3次打击任务，情报显示第4次任务窗口即将开启。',
    actions: ['侦察任务 T+2h', '备战状态 T+6h', '可能打击 T+24h'] },
  { id: 'AG2', name: '伊朗革命卫队',   role: '防御方', type: 'military',      status: 'alert',       threat: 0.78,
    summary: '侦测到以军雷达信号增强，岸基导弹阵地已激活，无人机部队处于一级战备。',
    actions: ['导弹就位 T+1h', '无人机备战 T+3h', '报复窗口 T+24h'] },
  { id: 'AG3', name: '美国中央司令部', role: '监视方', type: 'military',      status: 'monitoring',  threat: 0.45,
    summary: 'CVN-77编队位于霍尔木兹海峡入口，电子侦察机24小时在轨，向双方释放威慑信号。',
    actions: ['舰队定位 持续', '情报共享 T+2h', '威慑表态 T+6h'] },
  { id: 'AG4', name: '联合国安理会',   role: '调解方', type: 'diplomatic',    status: 'negotiating', threat: 0.08,
    summary: '紧急召开闭门会议，起草停火决议草案，向各方施压要求降级。',
    actions: ['闭门会议 进行中', '决议草案 T+12h', '投票表决 T+24h'] },
  { id: 'AG5', name: '伊拉克政府',     role: '中间方', type: 'government',    status: 'neutral',     threat: 0.30,
    summary: '领土内发生未经授权军事行动，向各方发出外交抗议，要求撤军并赔偿。',
    actions: ['外交抗议 T+1h', '边境管控 T+3h', '外交斡旋 T+12h'] },
  { id: 'AG6', name: '国际原子能机构', role: '核查方', type: 'international', status: 'active',      threat: 0.05,
    summary: '要求对核设施进行紧急视察，已发出正式通知，等待伊方回复。',
    actions: ['核查请求 已发出', '视察窗口 T+48h', '核查报告 T+72h'] },
]

export const SIM_INTERACTIONS = [
  { id: 'SI1', source: 'AG1', target: 'AG2', type: 'strike',      label: '打击行动',   confidence: 0.88, timeWindow: 'T+24h', desc: '以色列空军计划对革命卫队设施实施精准打击，置信度高。' },
  { id: 'SI2', source: 'AG2', target: 'AG1', type: 'retaliation', label: '无人机报复', confidence: 0.72, timeWindow: 'T+48h', desc: '革命卫队无人机群将对以色列境内目标发动报复打击。' },
  { id: 'SI3', source: 'AG3', target: 'AG2', type: 'deterrence',  label: '舰队威慑',   confidence: 0.91, timeWindow: 'T+6h',  desc: 'CVN-77向海峡内侧机动，向伊朗释放明确战略威慑信号。' },
  { id: 'SI4', source: 'AG3', target: 'AG1', type: 'intel',       label: '情报共享',   confidence: 0.85, timeWindow: 'T+2h',  desc: '美军向以色列分享实时目标情报，协调打击窗口。' },
  { id: 'SI5', source: 'AG4', target: 'AG1', type: 'diplomatic',  label: '外交施压',   confidence: 0.55, timeWindow: 'T+12h', desc: '联合国安理会向以色列施压要求暂停军事行动。' },
  { id: 'SI6', source: 'AG4', target: 'AG2', type: 'diplomatic',  label: '降级谈判',   confidence: 0.60, timeWindow: 'T+12h', desc: '安理会通过伊拉克渠道向伊朗传递降级意向。' },
  { id: 'SI7', source: 'AG5', target: 'AG1', type: 'protest',     label: '外交抗议',   confidence: 0.95, timeWindow: 'T+1h',  desc: '伊拉克政府正式抗议以军使用其领空实施打击行动。' },
  { id: 'SI8', source: 'AG6', target: 'AG2', type: 'inspection',  label: '核查要求',   confidence: 0.80, timeWindow: 'T+48h', desc: 'IAEA要求紧急核查伊朗浓缩铀设施是否受到打击影响。' },
]

export const SIM_PHASES = [
  { id: 0, label: '初始化',   desc: '加载信实链种子数据' },
  { id: 1, label: '环境搭建', desc: '构建行为方知识图谱' },
  { id: 2, label: '模拟运行', desc: '多Agent博弈推演中' },
  { id: 3, label: '报告生成', desc: '态势预测已输出' },
]

export const SIM_LOGS = [
  { time: '06:12:04', level: 'info',  text: '载入信实链验证节点 13 条，卫星锚定 7 条' },
  { time: '06:12:05', level: 'info',  text: '构建行为方知识图谱：识别 6 个实体，8 组交互关系' },
  { time: '06:12:07', level: 'warn',  text: 'AG2 [伊朗革命卫队] 威胁评估升级：0.65 → 0.78' },
  { time: '06:12:09', level: 'info',  text: 'AG3 [美国中央司令部] 释放威慑信号，AG2 响应概率 91%' },
  { time: '06:12:11', level: 'info',  text: 'AG1 [以色列空军] 打击窗口计算完成：T+24h ±2h' },
  { time: '06:12:14', level: 'warn',  text: 'AG4 [联合国安理会] 外交干预效果预测：有效性 55%' },
  { time: '06:12:16', level: 'info',  text: '模拟轮次 1/5 完成，整体置信度 0.74' },
  { time: '06:12:19', level: 'info',  text: '模拟轮次 2/5 完成，AG2 报复概率收敛至 0.72' },
  { time: '06:12:22', level: 'error', text: 'AG5 [伊拉克政府] 行为模型数据不足，置信度降级' },
  { time: '06:12:25', level: 'info',  text: '模拟轮次 3/5 完成，态势熵值趋于稳定' },
  { time: '06:12:28', level: 'info',  text: '模拟轮次 4/5 完成，报复/降级双路径并存' },
  { time: '06:12:31', level: 'info',  text: '模拟轮次 5/5 完成，生成最终预测报告' },
  { time: '06:12:33', level: 'info',  text: '世界模拟完成 · 整体置信度 0.79 · 主路径：有限冲突后降级' },
]

// ── 开源情报事件（OSINT）────────────────────────────────────────
// 置信度由大模型结合信实链数据库综合评分，坐标为模糊坐标（低精度）
export const OSINT_EVENTS = [
  {
    id: 'O1',
    title: '社交媒体：胡拉玛附近爆炸声',
    content: '多名当地居民在推特上报告听到连续爆炸声，并观测到火光，方向为西北方向军事设施。',
    source: 'Twitter · @IraqSecurity',
    sourceType: 'social',
    date: '2025-11-02 23:41',
    lat: 35.49, lng: 45.05,
    confidence: 0.32,
    llmAnalysis: '信源为匿名社交账号，内容与A链已知打击时间高度吻合，但缺乏多源佐证，置信度偏低。',
    relatedChain: 'A',
    relatedSiteId: 'S3',
  },
  {
    id: 'O2',
    title: '新闻报道：F-16战队目击',
    content: '路透社援引匿名官员称，多架F-16于当地时间凌晨起飞，目标不明，飞行方向朝伊朗边境。',
    source: '路透社',
    sourceType: 'news',
    date: '2025-11-03 06:30',
    lat: 36.62, lng: 42.53,
    confidence: 0.61,
    llmAnalysis: '路透社信源可靠性较高，内容与A1节点卫星轨迹数据存在时间空间吻合，已纳入A链加权。',
    relatedChain: 'A',
    relatedSiteId: 'S1',
  },
  {
    id: 'O3',
    title: '匿名电报：伊朗海军异动',
    content: 'Telegram频道消息称霍尔木兹海峡附近发现异常海军集结，无法核实发布者身份。',
    source: 'Telegram · 匿名频道',
    sourceType: 'anonymous',
    date: '2025-11-01 14:20',
    lat: 26.55, lng: 56.28,
    confidence: 0.21,
    llmAnalysis: '信源完全匿名，内容可能与B链事件相关，但与已有AIS数据存在时间矛盾，置信度极低。',
    relatedChain: 'B',
    relatedSiteId: 'S4',
  },
  {
    id: 'O4',
    title: '官方声明：伊拉克否认基地扩建',
    content: '伊拉克国防部发声明否认境内某空军基地存在跑道延伸施工，与卫星影像相矛盾。',
    source: '伊拉克国防部官网',
    sourceType: 'official',
    date: '2025-10-29 10:00',
    lat: 33.12, lng: 43.72,
    confidence: 0.44,
    llmAnalysis: '官方否认声明与C链卫星验证影像内容直接矛盾，综合分析认为声明可信度低，列入反向信源。',
    relatedChain: 'C',
    relatedSiteId: 'S6',
  },
  {
    id: 'O5',
    title: '开源论坛：导弹车目击报告',
    content: '多个军事观察论坛用户报告，在伊朗西海岸公路发现疑似导弹发射车车队移动。',
    source: 'AirPower论坛 · r/MiddleEastConflict',
    sourceType: 'social',
    date: '2025-11-02 18:05',
    lat: 27.22, lng: 56.05,
    confidence: 0.55,
    llmAnalysis: '多平台同源报告增强可信度，内容与B2节点激活记录时间一致，已辅助提升B链整体加权分。',
    relatedChain: 'B',
    relatedSiteId: 'S5',
  },
  {
    id: 'O6',
    title: '新闻：卫星图显示新型雷达部署',
    content: 'Planet Labs商业卫星图片被军事分析博主解读为新型远程雷达阵地，尚未得到官方证实。',
    source: 'BellingCat分析',
    sourceType: 'news',
    date: '2025-10-31 09:15',
    lat: 33.28, lng: 44.15,
    confidence: 0.73,
    llmAnalysis: 'BellingCat方法论较为严谨，商业影像可信，内容与C链C3节点雷达部署吻合，置信度中高。',
    relatedChain: 'C',
    relatedSiteId: 'S6',
  },
  {
    id: 'O7',
    title: '社交媒体：侦察机低空飞越',
    content: '多名民众拍摄到疑似无人侦察机在伊拉克北部低空飞行，视频在TikTok广泛传播。',
    source: 'TikTok · 多用户',
    sourceType: 'social',
    date: '2025-11-01 20:33',
    lat: 35.22, lng: 43.82,
    confidence: 0.48,
    llmAnalysis: '视频真实性难以验证，飞行特征与A2节点记录的侦察任务时间接近，已标记为弱关联参考。',
    relatedChain: 'A',
    relatedSiteId: 'S2',
  },
]
