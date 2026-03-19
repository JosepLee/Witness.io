// ============================================================
//  SATINT Demo — Shared Mock Data
//  All three modules draw from this single source of truth.
// ============================================================

// ── 事件节点 ─────────────────────────────────────────────────
export const EVENTS = [
  // 链 A：空袭行动链
  { id: "A1", label: "F-16编队离场\n塔尔阿夫尔基地", chain: "A", score: 0.95, verified: true, siteId: "S1", source: "OpenSky轨迹", date: "2025-11-03 06:12", detail: "OpenSky记录4架F-16于06:12从塔尔阿夫尔基地起飞，航向270°。" },
  { id: "A2", label: "侦察机\n进入目标区", chain: "A", score: 0.88, verified: true, siteId: "S2", source: "OpenSky轨迹", date: "2025-11-03 06:41", detail: "RC-135侦察机在目标区域盘旋40分钟，疑似引导打击。" },
  { id: "A3", label: "胡拉玛基地\n爆炸声报道", chain: "A", score: 0.55, verified: false, siteId: null, source: "社交媒体", date: "2025-11-03 07:15", detail: "多个当地账号发布爆炸声音频，尚未核实。" },
  { id: "A4", label: "卫星影像确认\n设施受损", chain: "A", score: 0.97, verified: true, siteId: "S3", source: "卫星存档验证", date: "2025-11-03 10:00", detail: "过境影像确认2号机库屋顶坍塌，跑道有弹坑×3。" },
  { id: "A5", label: "伤亡数字\n官方通报", chain: "A", score: 0.62, verified: false, siteId: null, source: "官方媒体", date: "2025-11-03 12:30", detail: "官方声称无人员伤亡，与社交媒体说法存在分歧。" },
  { id: "A6", label: "战斗机\n返回基地确认", chain: "A", score: 0.91, verified: true, siteId: "S1", source: "OpenSky轨迹", date: "2025-11-03 09:50", detail: "OpenSky记录F-16编队于09:50降落，与出发数量一致。" },
  // 链 B：舰队集结链
  { id: "B1", label: "航母编队\n波斯湾入口", chain: "B", score: 0.93, verified: true, siteId: "S4", source: "AIS船舶数据", date: "2025-11-01 14:00", detail: "AIS数据显示CVN-77及护卫舰群进入霍尔木兹海峡。" },
  { id: "B2", label: "岸基导弹\n阵地激活", chain: "B", score: 0.71, verified: true, siteId: "S5", source: "卫星存档验证", date: "2025-11-01 18:00", detail: "卫星影像显示反舰导弹发射车离开遮蔽棚。" },
  { id: "B3", label: "双方舰艇\n对峙报道", chain: "B", score: 0.45, verified: false, siteId: null, source: "路透社", date: "2025-11-01 20:15", detail: "路透社援引匿名消息，尚无影像证据。" },
  { id: "B4", label: "海峡通行\n恢复正常", chain: "B", score: 0.82, verified: true, siteId: "S4", source: "AIS船舶数据", date: "2025-11-02 08:00", detail: "AIS恢复正常民船通行记录，对峙解除。" },
  // 链 C：基地扩建链
  { id: "C1", label: "工程车辆\n进入基地", chain: "C", score: 0.88, verified: true, siteId: "S6", source: "卫星存档验证", date: "2025-10-15 00:00", detail: "连续3期影像显示重型工程机械驶入西侧区域。" },
  { id: "C2", label: "跑道延伸\n施工中", chain: "C", score: 0.92, verified: true, siteId: "S6", source: "卫星存档验证", date: "2025-10-28 00:00", detail: "跑道向北延伸约400m，可供重型轰炸机起降。" },
  { id: "C3", label: "新型雷达\n疑似部署", chain: "C", score: 0.6, verified: false, siteId: null, source: "开源论坛", date: "2025-11-01 00:00", detail: "网络图片显示大型雷达天线，真实性待核实。" },
  { id: "C4", label: "外国技术人员\n入境", chain: "C", score: 0.38, verified: false, siteId: null, source: "未具名线人", date: "2025-11-02 00:00", detail: "单一来源，可信度低，待交叉验证。" },
  // 链 J1：日本海上监控链
  { id: "J1", label: "宙斯盾舰出港\n横须贺基地", chain: "J1", score: 0.94, verified: true, siteId: "JS1", source: "AIS船舶数据", date: "2025-11-05 08:20", detail: "AIS记录DDG-173爱宕号驱逐舰离港，向日本海方向驶去。" },
  { id: "J2", label: "弹道导弹\n预警雷达激活", chain: "J1", score: 0.89, verified: true, siteId: "JS2", source: "信号情报", date: "2025-11-05 09:00", detail: "三沢基地AN/TPY-2雷达探测到半岛方向异常信号。" },
  { id: "J3", label: "半岛发射活动\n未经核实", chain: "J1", score: 0.52, verified: false, siteId: null, source: "社交媒体", date: "2025-11-05 09:18", detail: "韩国社媒出现火光目击报告，日本官方暂未确认。" },
  { id: "J4", label: "PAC-3阵地\n进入待命", chain: "J1", score: 0.91, verified: true, siteId: "JS3", source: "卫星存档验证", date: "2025-11-05 09:30", detail: "沖绳那霸PAC-3导弹阵地雷达开机，发射架展开。" },
  // 链 J2：航空自卫队动态链
  { id: "J5", label: "F-35A紧急升空\n三沢基地", chain: "J2", score: 0.96, verified: true, siteId: "JS2", source: "OpenSky轨迹", date: "2025-11-06 14:10", detail: "4架F-35A从三沢基地紧急升空，疑似应对俄罗斯侦察机入侵。" },
  { id: "J6", label: "俄侦察机\n接近领空", chain: "J2", score: 0.78, verified: true, siteId: null, source: "防卫省公开通报", date: "2025-11-06 14:30", detail: "防卫省通报1架俄罗斯IL-20M侦察机在日本海接近领海基线。" },
  { id: "J7", label: "伴飞驱离\n任务完成", chain: "J2", score: 0.88, verified: true, siteId: "JS2", source: "OpenSky轨迹", date: "2025-11-06 15:45", detail: "F-35A完成伴飞驱离任务返航，俄侦察机脱离日本海空域。" },
];

export const EDGES = [
  { source: "A1", target: "A2" }, { source: "A2", target: "A3" }, { source: "A3", target: "A4" },
  { source: "A4", target: "A5" }, { source: "A1", target: "A6" }, { source: "A4", target: "A6" },
  { source: "B1", target: "B2" }, { source: "B2", target: "B3" }, { source: "B3", target: "B4" },
  { source: "C1", target: "C2" }, { source: "C2", target: "C3" }, { source: "C3", target: "C4" },
  { source: "A1", target: "B1", crossChain: true }, { source: "C2", target: "A1", crossChain: true },
  { source: "J1", target: "J2" }, { source: "J2", target: "J3" }, { source: "J3", target: "J4" },
  { source: "J5", target: "J6" }, { source: "J6", target: "J7" },
];

// ── 伊朗专题基地 ─────────────────────────────────────────────
export const SITES_IRAN = [
  {
    id: "S1", name: "塔尔阿夫尔空军基地", lat: 36.679, lng: 42.447, country: "伊拉克", type: "空军基地",
    combatScore: 82, scoreHistory: [65, 68, 72, 70, 75, 78, 82],
    equipment: [
      { name: "F-16 Fighting Falcon", count: 12, change: "+2", verified: true },
      { name: "C-130 Hercules", count: 4, change: "0", verified: true },
      { name: "MQ-9 Reaper", count: 3, change: "+1", verified: false },
      { name: "SAM 阵地 (Patriot)", count: 2, change: "0", verified: true },
    ],
    imagery: [
      { date: "2025-11-03", label: "任务返回后", desc: "跑道正常，停机坪F-16 12架可见", score: 0.91 },
      { date: "2025-10-28", label: "任务前状态", desc: "停机坪F-16 10架，新增2架", score: 0.88 },
      { date: "2025-10-15", label: "基线状态", desc: "F-16 10架，C-130 4架，正常部署", score: 0.85 },
    ],
    status: "operational", strategicValue: "S", aci: 88, dci: 75,
    dailyData: { dates: ["10/28","10/29","10/30","10/31","11/01","11/02","11/03"], aci: [82,83,85,86,87,88,88], dci: [70,71,72,73,74,75,75] },
    facilities: [
      { name: "主跑道", damage: 0, verified: true }, { name: "加固机库", damage: 0, verified: true },
      { name: "F-16停机坪", damage: 0, verified: true }, { name: "SAM阵地", damage: 0, verified: true },
    ],
  },
  {
    id: "S2", name: "侦察机前进基地(代号)", lat: 35.1, lng: 43.9, country: "伊拉克", type: "前沿部署",
    combatScore: 55, scoreHistory: [40,42,48,50,53,55,55],
    equipment: [{ name: "RC-135 侦察机", count: 1, change: "0", verified: true }],
    imagery: [{ date: "2025-11-03", label: "侦察任务中", desc: "RC-135在目标区上空", score: 0.88 }],
    status: "operational", strategicValue: "B", aci: 57, dci: 44,
    dailyData: { dates: ["10/28","10/29","10/30","10/31","11/01","11/02","11/03"], aci: [38,39,40,40,40,40,40], dci: [28,29,30,30,30,30,30] },
    facilities: [{ name: "临时跑道", damage: 0, verified: true }, { name: "侦察设备区", damage: 0, verified: true }],
  },
  {
    id: "S3", name: "胡拉玛军事设施", lat: 35.5, lng: 45.1, country: "伊朗边境区", type: "受打击目标",
    combatScore: 28, scoreHistory: [78,78,78,78,30,28,28],
    equipment: [
      { name: "机库 (2#已损毁)", count: 3, change: "-1", verified: true },
      { name: "跑道 (有弹坑)", count: 1, change: "受损", verified: true },
    ],
    imagery: [
      { date: "2025-11-03", label: "打击后", desc: "2号机库坍塌，跑道弹坑×3，车辆疏散", score: 0.97 },
      { date: "2025-10-31", label: "打击前", desc: "设施完整，车辆活动正常", score: 0.95 },
    ],
    status: "destroyed", strategicValue: "A", aci: 15, dci: 13,
    dailyData: { dates: ["10/28","10/29","10/30","10/31","11/01","11/02","11/03"], aci: [75,76,77,77,75,20,18], dci: [68,68,69,70,68,18,15] },
    facilities: [
      { name: "主机库(1#)", damage: 0, verified: true }, { name: "机库(2#受损)", damage: 95, verified: true },
      { name: "主跑道", damage: 40, verified: true }, { name: "指挥中心", damage: 60, verified: false },
    ],
  },
  {
    id: "S4", name: "霍尔木兹海峡监控区", lat: 26.6, lng: 56.4, country: "伊朗/阿曼", type: "海上监控点",
    combatScore: 70, scoreHistory: [55,58,62,68,70,70,70],
    equipment: [
      { name: "CVN-77 航母", count: 1, change: "+1", verified: true },
      { name: "提康德罗加级巡洋舰", count: 2, change: "+2", verified: true },
      { name: "阿利伯克级驱逐舰", count: 4, change: "+4", verified: false },
    ],
    imagery: [
      { date: "2025-11-02", label: "对峙解除", desc: "航母编队向东驶出，民船通行恢复", score: 0.82 },
      { date: "2025-11-01", label: "集结中", desc: "航母及护卫舰群在海峡口徘徊", score: 0.93 },
    ],
    status: "operational", strategicValue: "S", aci: 92, dci: 85,
    dailyData: { dates: ["10/28","10/29","10/30","10/31","11/01","11/02","11/03"], aci: [80,82,85,88,92,92,92], dci: [72,74,78,82,85,85,85] },
    facilities: [{ name: "CVN-77 甲板", damage: 0, verified: true }, { name: "护卫编队", damage: 0, verified: false }],
  },
  {
    id: "S5", name: "岸基导弹阵地(代号)", lat: 27.1, lng: 56.9, country: "伊朗", type: "导弹阵地",
    combatScore: 65, scoreHistory: [60,60,62,63,65,65,65],
    equipment: [{ name: "反舰导弹发射车", count: 6, change: "+6", verified: true }],
    imagery: [{ date: "2025-11-01", label: "激活状态", desc: "6辆导弹发射车驶离遮蔽棚，展开部署", score: 0.71 }],
    status: "damaged", strategicValue: "A", aci: 55, dci: 70,
    dailyData: { dates: ["10/28","10/29","10/30","10/31","11/01","11/02","11/03"], aci: [50,51,52,53,55,55,55], dci: [62,64,65,68,70,70,70] },
    facilities: [{ name: "发射车遮蔽棚", damage: 0, verified: true }, { name: "雷达站", damage: 20, verified: false }],
  },
  {
    id: "S6", name: "某扩建空军基地", lat: 33.2, lng: 44.3, country: "伊拉克", type: "扩建施工中",
    combatScore: 71, scoreHistory: [58,60,62,65,68,70,71],
    equipment: [
      { name: "跑道 (延伸中)", count: 1, change: "+400m", verified: true },
      { name: "重型工程机械", count: 8, change: "施工", verified: true },
      { name: "疑似新型雷达", count: 1, change: "待核实", verified: false },
    ],
    imagery: [
      { date: "2025-11-01", label: "当前状态", desc: "跑道北段延伸400m，雷达天线疑似安装", score: 0.88 },
      { date: "2025-10-28", label: "施工中期", desc: "跑道延伸200m，工程机械活跃", score: 0.92 },
      { date: "2025-10-15", label: "施工初期", desc: "西侧出现工程车辆，土方作业", score: 0.88 },
    ],
    status: "damaged", strategicValue: "A", aci: 62, dci: 58,
    dailyData: { dates: ["10/15","10/20","10/25","10/28","10/30","11/01","11/03"], aci: [50,53,55,58,60,61,62], dci: [48,50,52,54,56,57,58] },
    facilities: [
      { name: "跑道(延伸中)", damage: 0, verified: true },
      { name: "新型雷达阵地", damage: 0, verified: false },
      { name: "工程施工区", damage: 0, verified: true },
    ],
  },
];

// ── 日本专题基地 ─────────────────────────────────────────────
export const SITES_JAPAN = [
  {
    id: "JS1", name: "横须贺海军基地", lat: 35.283, lng: 139.667, country: "日本", type: "海军基地",
    combatScore: 88, scoreHistory: [80,82,83,85,86,87,88],
    equipment: [
      { name: "宙斯盾驱逐舰 DDG-173", count: 1, change: "出港", verified: true },
      { name: "核动力航母 CVN-76", count: 1, change: "0", verified: true },
      { name: "P-8A 海神巡逻机", count: 4, change: "+1", verified: true },
      { name: "MH-60R 海鹰直升机", count: 8, change: "0", verified: false },
    ],
    imagery: [
      { date: "2025-11-05", label: "DDG出港后", desc: "CVN-76在泊，P-8A 4架可见，码头活动正常", score: 0.94 },
      { date: "2025-11-01", label: "满员状态", desc: "DDG-173在泊，全编制舰艇正常部署", score: 0.91 },
      { date: "2025-10-20", label: "基线状态", desc: "舰队正常编制，无异常活动", score: 0.89 },
    ],
    status: "operational", strategicValue: "S", aci: 90, dci: 82,
    dailyData: { dates: ["10/30","10/31","11/01","11/02","11/03","11/04","11/05"], aci: [84,85,86,87,88,89,90], dci: [78,79,80,80,81,82,82] },
    facilities: [
      { name: "主码头区", damage: 0, verified: true },
      { name: "舰载机坪", damage: 0, verified: true },
      { name: "弹药补给区", damage: 0, verified: true },
      { name: "水下维修坞", damage: 0, verified: false },
    ],
  },
  {
    id: "JS2", name: "三沢空军基地", lat: 40.703, lng: 141.368, country: "日本", type: "空军基地",
    combatScore: 79, scoreHistory: [70,72,73,75,76,78,79],
    equipment: [
      { name: "F-35A 闪电II", count: 14, change: "+2", verified: true },
      { name: "F-16 Fighting Falcon", count: 6, change: "0", verified: true },
      { name: "AN/TPY-2 弹道导弹雷达", count: 1, change: "激活", verified: true },
      { name: "E-3 望楼预警机", count: 2, change: "0", verified: false },
    ],
    imagery: [
      { date: "2025-11-06", label: "紧急升空后", desc: "F-35A 10架在停机坪，AN/TPY-2雷达开机状态", score: 0.96 },
      { date: "2025-11-05", label: "预警激活", desc: "雷达站异常辐射信号，F-35A戒备状态", score: 0.89 },
      { date: "2025-10-28", label: "常规状态", desc: "F-35A 14架，F-16 6架，正常部署", score: 0.87 },
    ],
    status: "operational", strategicValue: "S", aci: 85, dci: 78,
    dailyData: { dates: ["10/31","11/01","11/02","11/03","11/04","11/05","11/06"], aci: [78,79,80,81,82,84,85], dci: [72,73,74,75,76,77,78] },
    facilities: [
      { name: "主跑道", damage: 0, verified: true },
      { name: "F-35A加固机库", damage: 0, verified: true },
      { name: "AN/TPY-2雷达站", damage: 0, verified: true },
      { name: "联合作战中心", damage: 0, verified: false },
    ],
  },
  {
    id: "JS3", name: "那霸防空基地", lat: 26.196, lng: 127.646, country: "日本 (沖绳)", type: "防空基地",
    combatScore: 74, scoreHistory: [65,67,68,70,71,73,74],
    equipment: [
      { name: "PAC-3 爱国者导弹", count: 4, change: "展开", verified: true },
      { name: "F-15J 鹰式战斗机", count: 18, change: "0", verified: true },
      { name: "地对空导弹阵地", count: 3, change: "+1", verified: true },
      { name: "警戒管制雷达", count: 2, change: "激活", verified: true },
    ],
    imagery: [
      { date: "2025-11-05", label: "PAC-3激活", desc: "PAC-3发射架展开，F-15J 12架处于快速反应状态", score: 0.91 },
      { date: "2025-11-01", label: "常规状态", desc: "F-15J 18架在坪，防空阵地正常值班", score: 0.88 },
    ],
    status: "operational", strategicValue: "A", aci: 68, dci: 88,
    dailyData: { dates: ["10/30","10/31","11/01","11/02","11/03","11/04","11/05"], aci: [60,62,63,64,65,66,68], dci: [80,81,82,84,85,87,88] },
    facilities: [
      { name: "主跑道", damage: 0, verified: true },
      { name: "PAC-3阵地", damage: 0, verified: true },
      { name: "F-15J机库", damage: 0, verified: true },
      { name: "指挥通信中心", damage: 0, verified: true },
    ],
  },
  {
    id: "JS4", name: "嘉手纳空军基地", lat: 26.356, lng: 127.768, country: "日本 (沖绳)", type: "美军空军基地",
    combatScore: 91, scoreHistory: [85,86,87,88,89,90,91],
    equipment: [
      { name: "F-22 猛禽战斗机", count: 6, change: "+6 (TDY)", verified: true },
      { name: "KC-135 同温层油船", count: 4, change: "0", verified: true },
      { name: "RC-135 铆钉接头侦察机", count: 2, change: "+1", verified: true },
      { name: "HH-60G 铺路鹰", count: 3, change: "0", verified: false },
    ],
    imagery: [
      { date: "2025-11-06", label: "F-22部署后", desc: "F-22 6架临时部署，跑道活动频繁", score: 0.95 },
      { date: "2025-11-02", label: "部署前", desc: "KC-135 4架，RC-135 1架，正常编制", score: 0.92 },
    ],
    status: "operational", strategicValue: "S", aci: 94, dci: 86,
    dailyData: { dates: ["10/31","11/01","11/02","11/03","11/04","11/05","11/06"], aci: [88,89,89,90,91,92,94], dci: [82,83,83,84,85,85,86] },
    facilities: [
      { name: "主跑道（双向）", damage: 0, verified: true },
      { name: "F-22临时机库", damage: 0, verified: true },
      { name: "空中加油站台", damage: 0, verified: true },
      { name: "侦察情报处理中心", damage: 0, verified: false },
    ],
  },
  {
    id: "JS5", name: "饭冢通信基地 (受损)", lat: 33.641, lng: 130.692, country: "日本", type: "通信/电子战",
    combatScore: 41, scoreHistory: [72,72,72,72,45,43,41],
    equipment: [
      { name: "ELQ-1 对地监视雷达", count: 1, change: "受损", verified: true },
      { name: "超视距通信天线阵", count: 3, change: "-1受损", verified: true },
      { name: "电子战支援设施", count: 1, change: "停机", verified: false },
    ],
    imagery: [
      { date: "2025-11-04", label: "事故后", desc: "天线阵1组倒塌，维修车辆进场，雷达停机", score: 0.93 },
      { date: "2025-10-30", label: "正常状态", desc: "天线阵3组正常运行，雷达值班", score: 0.90 },
    ],
    status: "damaged", strategicValue: "A", aci: 30, dci: 55,
    dailyData: { dates: ["10/29","10/30","10/31","11/01","11/02","11/03","11/04"], aci: [68,69,70,70,68,40,30], dci: [65,66,66,67,65,58,55] },
    facilities: [
      { name: "主天线阵(1#受损)", damage: 85, verified: true },
      { name: "主天线阵(2#)", damage: 0, verified: true },
      { name: "主天线阵(3#)", damage: 0, verified: true },
      { name: "电子战中心", damage: 30, verified: false },
    ],
  },
  {
    id: "JS6", name: "佐世保海军基地", lat: 33.158, lng: 129.722, country: "日本", type: "海军基地",
    combatScore: 76, scoreHistory: [68,70,71,72,74,75,76],
    equipment: [
      { name: "两栖攻击舰 LHA", count: 1, change: "0", verified: true },
      { name: "宙斯盾驱逐舰", count: 3, change: "+1", verified: true },
      { name: "扫雷舰", count: 4, change: "0", verified: true },
      { name: "MV-22 鱼鹰", count: 12, change: "0", verified: false },
    ],
    imagery: [
      { date: "2025-11-05", label: "当前状态", desc: "LHA在泊，宙斯盾舰3艘，MV-22甲板可见", score: 0.88 },
      { date: "2025-10-28", label: "出发前", desc: "DDG-180护卫舰返港加入编队", score: 0.85 },
    ],
    status: "operational", strategicValue: "A", aci: 72, dci: 79,
    dailyData: { dates: ["10/30","10/31","11/01","11/02","11/03","11/04","11/05"], aci: [66,68,69,70,71,71,72], dci: [73,74,75,76,77,78,79] },
    facilities: [
      { name: "主码头", damage: 0, verified: true },
      { name: "两栖舰停泊区", damage: 0, verified: true },
      { name: "弹药装载区", damage: 0, verified: true },
      { name: "海上自卫队司令部", damage: 0, verified: false },
    ],
  },
];

// ── 统一导出（保持向后兼容，默认导出伊朗数据）────────────────
export const SITES = SITES_IRAN;

// ── 专题配置表（后续增加新专题只需在此追加）──────────────────
export const THEATERS = [
  {
    id: "iran",
    label: "伊朗专题",
    labelEn: "IRAN THEATER",
    flag: "🇮🇷",
    sites: SITES_IRAN,
    camera: { lng: 48, lat: 32, alt: 4200000 },
    newsMarkers: null, // 将在下方赋值
    osintEvents: null,
  },
  {
    id: "japan",
    label: "日本专题",
    labelEn: "JAPAN THEATER",
    flag: "🇯🇵",
    sites: SITES_JAPAN,
    camera: { lng: 136, lat: 36, alt: 2800000 },
    newsMarkers: null,
    osintEvents: null,
  },
];

// ── 报告数据 ─────────────────────────────────────────────────
export const REPORT = {
  title: "INTELLIGENCE PREDICTION REPORT",
  subtitle: "智能预测与打击链评估",
  generatedAt: "2026-03-12 11:24:08",
  confidence: 0.84,
  sources: [
    { label: "历史飞行轨迹", confidence: 0.86, verified: true, sourceType: "chain" },
    { label: "卫星影像复核", confidence: 0.91, verified: true, sourceType: "satellite" },
    { label: "OSINT 公开情报", confidence: 0.58, verified: false, sourceType: "osint" },
    { label: "前进基地活动记录", confidence: 0.72, verified: true, sourceType: "chain" },
  ],
  summary: `根据OpenSky飞行数据、卫星存档影像及多源开源情报综合分析：\n\n2025年11月3日06:12，4架F-16战斗机从塔尔阿夫尔基地起飞，航向270°。结合RC-135侦察机同期在目标区域盘旋的记录，研判本次出动目的为对胡拉玛军事设施实施精确打击。\n\n07:15社交媒体出现爆炸报道，10:00卫星过境影像**确认**2号机库坍塌、跑道弹坑×3，与打击时间窗口吻合，置信度97%。\n\n**预测**：根据F-16编队历史出动模式（间隔约22小时）及侦察机未撤离迹象，预判明日05:30将有第二波出动，目标为设施B（坐标34.8°N / 46.2°E）。`,
  predictions: [
    { time: "明日 05:30", label: "设施B再次出击风险升高", confidence: 0.81 },
    { time: "明日 06:00", label: "目标区进入结果验证阶段", confidence: 0.69 },
  ],
  agentReasoning: [
    { label: "当前判断", value: "再次出击概率高", color: "#8b5cf6" },
    { label: "主要依据", value: "历史航迹 + 卫星验证 + OSINT 聚合", color: "#0ea5e9" },
    { label: "推理状态", value: "已形成可执行预测", color: "#22c55e" },
  ],
  confidenceBreakdown: [
    { label: "飞行轨迹证据", score: 0.24, color: "#f59e0b" },
    { label: "卫星验证加权", score: 0.31, color: "#22c55e" },
    { label: "OSINT 关联补强", score: 0.12, color: "#0ea5e9" },
    { label: "信实链传播提升", score: 0.17, color: "#8b5cf6" },
  ],
  agentSuggestions: [
    "建议在明日03:30前触发一次卫星复核任务",
    "建议重点关注设施B周边车辆与热源活动",
    "建议同步复查前进基地相关链上节点变化",
  ],
  predictionTimeline: [
    { time: "05:10", label: "离场准备", level: "medium", color: "#f59e0b" },
    { time: "05:30", label: "高风险出击窗口", level: "high", color: "#ef4444" },
    { time: "05:50", label: "目标接近阶段", level: "high", color: "#8b5cf6" },
    { time: "06:10", label: "结果验证阶段", level: "medium", color: "#0ea5e9" },
  ],
  targetCandidates: [
    { name: "设施B", confidence: 0.81, color: "#8b5cf6" },
    { name: "跑道延伸区", confidence: 0.63, color: "#f59e0b" },
    { name: "雷达阵地", confidence: 0.57, color: "#0ea5e9" },
  ],
  feedbackResult: {
    confidence: 0.88,
    agentReasoning: [
      { label: "当前判断", value: "再次出击概率进一步升高", color: "#8b5cf6" },
      { label: "主要依据", value: "新增卫星复核 + 地面活动异常 + 链上节点更新", color: "#0ea5e9" },
      { label: "推理状态", value: "已接收验证反馈", color: "#22c55e" },
    ],
    confidenceBreakdown: [
      { label: "飞行轨迹证据", score: 0.24, color: "#f59e0b" },
      { label: "卫星验证加权", score: 0.35, color: "#22c55e" },
      { label: "OSINT 关联补强", score: 0.11, color: "#0ea5e9" },
      { label: "信实链传播提升", score: 0.18, color: "#8b5cf6" },
    ],
    predictions: [
      { time: "明日 05:30", label: "设施B再次出击风险显著升高", confidence: 0.84 },
      { time: "明日 05:50", label: "目标区进入重点验证窗口", confidence: 0.76 },
    ],
    predictionTimeline: [
      { time: "05:18", label: "离场准备", level: "medium", color: "#f59e0b" },
      { time: "05:30", label: "高风险出击窗口", level: "high", color: "#ef4444" },
      { time: "05:46", label: "目标接近阶段", level: "high", color: "#8b5cf6" },
      { time: "06:02", label: "结果验证阶段", level: "medium", color: "#0ea5e9" },
    ],
    targetCandidates: [
      { name: "设施B", confidence: 0.84, color: "#8b5cf6" },
      { name: "跑道延伸区", confidence: 0.59, color: "#f59e0b" },
      { name: "雷达阵地", confidence: 0.52, color: "#0ea5e9" },
    ],
    agentSuggestions: [
      "建议将设施B列为下一轮卫星复核最高优先级",
      "建议缩小监测窗口至 05:20–06:05",
      "建议同步回查目标区周边新增链上关联节点",
    ],
  },
};

export const SITE_EVENTS = {
  base: {
    title: "塔尔阿夫尔基地",
    events: [
      { id: "base-1", title: "编队离场准备", time: "2026-03-12 05:10", level: "medium", summary: "基地跑道周边出现连续车辆调度活动，疑似进入出击准备阶段。", source: "信实链节点 + 轨迹记录", suggestion: "建议持续关注离场窗口与后续航迹变化。" },
      { id: "base-2", title: "燃料补给异常增强", time: "2026-03-12 05:18", level: "high", summary: "补给区热源短时增强，结合地面活动记录，可能对应飞行前补给操作。", source: "卫星热源复核", suggestion: "建议提前触发下一轮地面活动验证任务。" },
    ],
  },
  recon: {
    title: "侦察前进基地",
    events: [
      { id: "recon-1", title: "盘旋轨迹聚集", time: "2026-03-12 05:42", level: "medium", summary: "侦察航迹在该区域形成重复轨迹，说明此点为阶段性中继与观察节点。", source: "轨迹聚合分析", suggestion: "建议标记为重点侦察中继区。" },
    ],
  },
  target: {
    title: "胡拉玛目标区",
    events: [
      { id: "target-1", title: "目标区热源增强", time: "2026-03-12 05:55", level: "high", summary: "目标区短时出现热源增强与活动波动，存在明显异常。", source: "卫星影像验证", suggestion: "建议提高该区域在当前行动链中的可信权重。" },
    ],
  },
  predict: {
    title: "设施B（预测）",
    events: [
      { id: "predict-1", title: "设施B风险升高", time: "2026-03-13 05:30", level: "high", summary: "多源证据叠加后，设施B成为下一轮行动的最高优先级候选目标。", source: "Agent 推理输出", suggestion: "建议优先安排该点卫星复核任务。" },
    ],
  },
};

// ── 伊朗专题地图标记 ─────────────────────────────────────────
export const NEWS_MARKERS_IRAN = [
  { id: "N1", lat: 36.3, lng: 43.5, title: "战机编队集结", date: "2025-11-03 05:45 UTC", source: "卫星实时监测", content: "多架战机在塔尔阿夫尔空军基地集结，准备执行任务。根据卫星实时影像，至少4架F-16战斗机已进入待命状态。", type: "military" },
  { id: "N2", lat: 35.3, lng: 44.8, title: "目标区域活动频繁", date: "2025-11-03 07:20 UTC", source: "社交媒体/OSINT", content: "当地民众报告听到多起爆炸声，空中有飞行物活动。官方目前未发布评论。", type: "news" },
  { id: "N3", lat: 35.5, lng: 45.1, title: "设施受损确认", date: "2025-11-03 10:15 UTC", source: "卫星影像分析", content: "最新卫星过境影像显示，胡拉玛军事设施2号机库屋顶已坍塌，主跑道上发现3处弹坑。", type: "verified" },
  { id: "N4", lat: 26.8, lng: 56.2, title: "航母编队通过海峡", date: "2025-11-01 14:30 UTC", source: "AIS船舶追踪", content: "美国第7舰队CVN-77航母编队进入霍尔木兹海峡。", type: "military" },
  { id: "N5", lat: 27.3, lng: 57.1, title: "防空导弹阵地激活", date: "2025-11-01 18:45 UTC", source: "卫星监测", content: "伊朗岸基反舰导弹阵地进入激活状态。6辆导弹发射车已离开遮蔽棚，进入临战部署。", type: "military" },
  { id: "N6", lat: 33.5, lng: 44.0, title: "跑道扩建工程进展", date: "2025-10-28 08:00 UTC", source: "卫星时序影像", content: "伊拉克某空军基地跑道扩建工程已完成50%。新增的北向跑道延伸可允许重型轰炸机起降。", type: "infrastructure" },
];

// ── 日本专题地图标记 ─────────────────────────────────────────
export const NEWS_MARKERS_JAPAN = [
  { id: "JN1", lat: 35.28, lng: 139.67, title: "横须贺舰队出港", date: "2025-11-05 08:30 UTC", source: "AIS船舶追踪", content: "宙斯盾驱逐舰DDG-173爱宕号离开横须贺港，驶向日本海方向，疑与半岛导弹警报有关。", type: "military" },
  { id: "JN2", lat: 40.7, lng: 141.4, title: "F-35A紧急升空", date: "2025-11-06 14:10 UTC", source: "OpenSky轨迹", content: "4架F-35A从三沢基地紧急升空，应对俄罗斯侦察机接近日本领空事件。已完成伴飞驱离任务。", type: "military" },
  { id: "JN3", lat: 26.2, lng: 127.6, title: "PAC-3展开部署", date: "2025-11-05 09:30 UTC", source: "卫星存档验证", content: "那霸基地PAC-3导弹系统进入激活状态，发射架展开，应对弹道导弹威胁预警。", type: "verified" },
  { id: "JN4", lat: 26.36, lng: 127.77, title: "F-22临时部署嘉手纳", date: "2025-11-06 12:00 UTC", source: "卫星影像分析", content: "6架F-22猛禽战斗机完成临时部署（TDY）至嘉手纳空军基地，嘉手纳战力显著增强。", type: "military" },
  { id: "JN5", lat: 33.64, lng: 130.69, title: "饭冢通信基地天线受损", date: "2025-11-04 22:00 UTC", source: "卫星影像分析", content: "卫星影像确认饭冢基地1号天线阵列出现结构性损毁，维修人员已入场，通信能力部分受限。", type: "news" },
  { id: "JN6", lat: 33.16, lng: 129.72, title: "佐世保编队扩充", date: "2025-11-05 16:00 UTC", source: "AIS船舶数据", content: "DDG-180护卫舰返港加入佐世保编队，目前该基地宙斯盾舰达3艘，战备等级提升。", type: "infrastructure" },
];

// ── 伊朗OSINT事件 ─────────────────────────────────────────────
export const OSINT_EVENTS_IRAN = [
  { id: 1, title: "目标区出现异常车辆活动", date: "2026-03-12 05:10", source: "OSINT", level: "medium", lat: 35.48, lng: 45.08, confidence: 0.58, sourceType: "social", relatedChain: "A", content: "多条公开社媒图像与短视频显示，目标区西南侧道路出现密集车辆进出，时间集中在行动窗口前后。", llmAnalysis: "车辆活动与既有链上节点时序基本吻合，但仍缺乏高分辨率卫星复核，当前仅可作为中等强度辅证。" },
  { id: 2, title: "社媒图像显示设施周边热源增加", date: "2026-03-12 05:26", source: "OSINT", level: "high", lat: 35.52, lng: 45.12, confidence: 0.76, sourceType: "news", relatedChain: "A", content: "公开传播的现场图像显示，设施周边在短时间内出现异常热源增强，位置与已知敏感设施外围区域接近。", llmAnalysis: "热源异常与目标区高风险时段高度重叠，且与信实链中节点形成互相印证，置信度较高。" },
  { id: 3, title: "公开频道出现疑似飞行准备信息", date: "2026-03-12 05:32", source: "OSINT", level: "medium", lat: 36.66, lng: 42.43, confidence: 0.49, sourceType: "anonymous", relatedChain: "A", content: "多个公开频道出现关于起飞前地勤准备、滑行排序与短时封控的讨论片段，真实性尚需交叉核实。", llmAnalysis: "该信息与基地起飞准备窗口接近，但来源碎片化，当前更适合作为早期预警信号，而非直接证据。" },
];

// ── 日本OSINT事件 ─────────────────────────────────────────────
export const OSINT_EVENTS_JAPAN = [
  { id: 101, title: "日本海方向出现不明飞行物轨迹", date: "2025-11-05 09:05", source: "OSINT", level: "high", lat: 38.5, lng: 133.2, confidence: 0.71, sourceType: "social", relatedChain: "J1", content: "多个日本渔船船员通过无线电报告在日本海发现高速飞行物体，轨迹疑似弹道导弹弧线。", llmAnalysis: "报告时间与三沢雷达激活时间高度吻合，置信度中偏高，但来源为非专业目击者。" },
  { id: 102, title: "SNS图片显示嘉手纳机坪异常", date: "2025-11-06 11:30", source: "OSINT", level: "medium", lat: 26.36, lng: 127.78, confidence: 0.65, sourceType: "news", relatedChain: "J2", content: "航空爱好者论坛上出现嘉手纳基地停机坪图片，可见疑似F-22隐身战斗机轮廓，与F-22TDY部署相符。", llmAnalysis: "图像分析与已知F-22侧影相符度约72%，结合基地活动增加的背景，判断为可信辅证。" },
  { id: 103, title: "那霸港附近居民报告异常声响", date: "2025-11-05 09:35", source: "OSINT", level: "low", lat: 26.21, lng: 127.65, confidence: 0.38, sourceType: "anonymous", relatedChain: "J1", content: "沖绳当地论坛出现居民反映听到类似雷达旋转的机械声和低频噪声，与PAC-3雷达开机时间接近。", llmAnalysis: "单一来源，无法核实，声响描述与PAC-3雷达特征不完全吻合，仅作低可信度参考。" },
];

// ── 将地图标记和OSINT回填到专题配置 ─────────────────────────
THEATERS[0].newsMarkers = NEWS_MARKERS_IRAN;
THEATERS[0].osintEvents = OSINT_EVENTS_IRAN;
THEATERS[1].newsMarkers = NEWS_MARKERS_JAPAN;
THEATERS[1].osintEvents = OSINT_EVENTS_JAPAN;

// ── 向后兼容导出（默认伊朗）────────────────────────────────
export const NEWS_MARKERS = NEWS_MARKERS_IRAN;
export const OSINT_EVENTS = OSINT_EVENTS_IRAN;

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
  { id: "A", name: "空袭行动链", description: "塔尔阿夫尔F-16出动 → 胡拉玛设施打击验证" },
  { id: "B", name: "舰队集结链", description: "CVN-77入波斯湾 → 岸基导弹激活 → 对峙解除" },
  { id: "C", name: "基地扩建链", description: "跑道延伸施工 → 新型雷达疑似部署" },
  { id: "J1", name: "日本海上警戒链", description: "宙斯盾出港 → 导弹预警激活 → PAC-3展开" },
  { id: "J2", name: "航空自卫队动态链", description: "F-35A紧急升空 → 俄侦察机驱离" },
];

export const SIM_LOGS = ["06:12 F-16 编队离场","06:28 进入侦察盘旋区","06:41 卫星确认目标活动增强","06:55 目标区出现异常热源"];
export const SIM_SEED_NODES = [
  { id: "SN0", label: "F-16 打击行动", sublabel: "信实链节点 #7 · 已验证", type: "seed_event", desc: "11月03日 06:12 UTC | 以色列F-16I编队对伊朗伊斯法罕革命卫队核相关设施实施4波次精准打击。" },
  { id: "SN1", label: "以色列空军 F-16I", sublabel: "内盖夫拉蒙基地起飞", type: "seed_actor", desc: "4架F-16I战斗机从拉蒙空军基地起飞，经约旦领空渗透。" },
  { id: "SN2", label: "伊斯法罕核设施", sublabel: "革命卫队研究基地", type: "seed_location", desc: "伊朗革命卫队伊斯法罕核相关研究设施，建筑北翼完全摧毁。" },
];
export const SIM_SEED_EDGES = [
  { id: "SE1", source: "SN1", target: "SN0", label: "执行打击", virtual: false },
  { id: "SE2", source: "SN0", target: "SN2", label: "命中目标", virtual: false },
];
export const SIM_AGENTS = [
  { id: "AG1", name: "美国五角大楼", shortName: "五角大楼", role: "战略决策", type: "us_mil", color: "#3b82f6", seedLink: "SN0", persona: "美国国防部高级战略顾问，评估中东打击事件的战略影响。" },
  { id: "AG2", name: "美军基地指挥官", shortName: "基地指挥官", role: "战术指挥", type: "us_mil", color: "#60a5fa", seedLink: "SN1", persona: "美国中东前进基地指挥官，协调打击行动后勤支持。" },
  { id: "AG3", name: "执行飞行员", shortName: "飞行员", role: "任务执行", type: "us_mil", color: "#93c5fd", seedLink: "SN1", persona: "以色列空军F-16I飞行员，刚完成高风险打击任务返航。" },
  { id: "AG4", name: "伊朗军方总部", shortName: "伊朗军方", role: "对抗指挥", type: "iran_mil", color: "#ef4444", seedLink: "SN2", persona: "伊朗伊斯兰革命卫队最高指挥部，评估损失规模，权衡报复时机。" },
  { id: "AG5", name: "伊朗现场指挥官", shortName: "现场指挥官", role: "损毁评估", type: "iran_mil", color: "#f87171", seedLink: "SN2", persona: "伊斯法罕设施附近革命卫队地区指挥官，组织救援并上报损毁情况。" },
  { id: "AG6", name: "伊朗防空阵地", shortName: "防空阵地", role: "防御分析", type: "iran_mil", color: "#fca5a5", seedLink: "SN0", persona: "伊朗S-300防空系统操作员，分析雷达回波数据寻找拦截漏洞。" },
  { id: "AG7", name: "军事情报机构", shortName: "情报机构", role: "情报分析", type: "intel", color: "#22c55e", seedLink: "SN0", persona: "美国中情局中东分析小组，综合多源情报评估打击效果。" },
  { id: "AG8", name: "国际媒体", shortName: "媒体", role: "信息扩散", type: "media", color: "#a78bfa", seedLink: "SN0", persona: "国际媒体驻中东特派记者网络，核实消息源准备发布报道。" },
];
export const SIM_ROUNDS = [
  { round: 1, label: "即时反应", timeOffset: "T+0~2h", desc: "各方收到打击消息后的第一波行动", nodes: [], edges: [] },
  { round: 2, label: "次级响应", timeOffset: "T+2~12h", desc: "基于第一波反应的连锁行动", nodes: [], edges: [] },
  { round: 3, label: "态势收敛", timeOffset: "T+12~72h", desc: "多路径预测：升级 / 降级 / 僵持", nodes: [], edges: [] },
];