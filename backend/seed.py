"""
seed.py — 初始化 witness.db 并填充假数据
运行方式：python seed.py
"""
import json
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "witness.db")


# ── 建表 ──────────────────────────────────────────────────────
DDL = """
CREATE TABLE IF NOT EXISTS theater (
    id          TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    label_en    TEXT NOT NULL,
    flag        TEXT NOT NULL,
    camera_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS geo_pos (
    id              TEXT PRIMARY KEY,
    numeric_id      INTEGER NOT NULL,
    theater_id      TEXT NOT NULL,
    name            TEXT NOT NULL,
    lat             REAL NOT NULL,
    lng             REAL NOT NULL,
    country         TEXT NOT NULL,
    type            TEXT NOT NULL,
    status          TEXT NOT NULL,
    strategic_value TEXT NOT NULL,
    score_json      TEXT NOT NULL,
    FOREIGN KEY (theater_id) REFERENCES theater(id)
);

CREATE TABLE IF NOT EXISTS geo_pos_image (
    id          INTEGER PRIMARY KEY,
    geo_pos_id  INTEGER NOT NULL,
    image_id    INTEGER NOT NULL,
    create_time TEXT NOT NULL,
    available   INTEGER NOT NULL DEFAULT 1
);
"""


# ── 专题数据 ──────────────────────────────────────────────────
THEATERS = [
    {
        "id": "iran",
        "label": "伊朗专题",
        "label_en": "IRAN THEATER",
        "flag": "🇮🇷",
        "camera": {"lng": 48, "lat": 32, "alt": 4200000},
    },
    {
        "id": "japan",
        "label": "日本专题",
        "label_en": "JAPAN THEATER",
        "flag": "🇯🇵",
        "camera": {"lng": 136, "lat": 36, "alt": 2800000},
    },
]


# ── 基地数据（含 score_json）────────────────────────────────
SITES = [
    # ── 伊朗专题 ──────────────────────────────────────────────
    {
        "id": "S1", "numeric_id": 101, "theater_id": "iran",
        "name": "塔尔阿夫尔空军基地", "lat": 36.679, "lng": 42.447,
        "country": "伊拉克", "type": "空军基地",
        "status": "operational", "strategic_value": "S",
        "score": {
            "aci": 88, "dci": 75, "combatScore": 82,
            "scoreHistory": [65, 68, 72, 70, 75, 78, 82],
            "dailyData": {
                "dates": ["10/28", "10/29", "10/30", "10/31", "11/01", "11/02", "11/03"],
                "aci":   [82, 83, 85, 86, 87, 88, 88],
                "dci":   [70, 71, 72, 73, 74, 75, 75],
            },
            "equipment": [
                {"name": "F-16 Fighting Falcon", "count": 12, "change": "+2", "verified": True},
                {"name": "C-130 Hercules",        "count": 4,  "change": "0",  "verified": True},
                {"name": "MQ-9 Reaper",            "count": 3,  "change": "+1", "verified": False},
                {"name": "SAM 阵地 (Patriot)",     "count": 2,  "change": "0",  "verified": True},
            ],
            "imagery": [
                {"date": "2025-11-03", "label": "任务返回后", "desc": "跑道正常，停机坪F-16 12架可见",    "score": 0.91},
                {"date": "2025-10-28", "label": "任务前状态", "desc": "停机坪F-16 10架，新增2架",         "score": 0.88},
                {"date": "2025-10-15", "label": "基线状态",   "desc": "F-16 10架，C-130 4架，正常部署",   "score": 0.85},
            ],
            "facilities": [
                {"name": "主跑道",      "damage": 0,  "verified": True},
                {"name": "加固机库",    "damage": 0,  "verified": True},
                {"name": "F-16停机坪",  "damage": 0,  "verified": True},
                {"name": "SAM阵地",     "damage": 0,  "verified": True},
            ],
        },
    },
    {
        "id": "S2", "numeric_id": 64, "theater_id": "iran",
        "name": "侦察机前进基地(代号)", "lat": 35.1, "lng": 43.9,
        "country": "伊拉克", "type": "前沿部署",
        "status": "operational", "strategic_value": "B",
        "score": {
            "aci": 57, "dci": 44, "combatScore": 55,
            "scoreHistory": [40, 42, 48, 50, 53, 55, 55],
            "dailyData": {
                "dates": ["10/28", "10/29", "10/30", "10/31", "11/01", "11/02", "11/03"],
                "aci":   [38, 39, 40, 40, 40, 40, 40],
                "dci":   [28, 29, 30, 30, 30, 30, 30],
            },
            "equipment": [
                {"name": "RC-135 侦察机", "count": 1, "change": "0", "verified": True},
            ],
            "imagery": [
                {"date": "2025-11-03", "label": "侦察任务中", "desc": "RC-135在目标区上空", "score": 0.88},
            ],
            "facilities": [
                {"name": "临时跑道",   "damage": 0, "verified": True},
                {"name": "侦察设备区", "damage": 0, "verified": True},
            ],
        },
    },
    {
        "id": "S3", "numeric_id": 65, "theater_id": "iran",
        "name": "胡拉玛军事设施", "lat": 35.5, "lng": 45.1,
        "country": "伊朗边境区", "type": "受打击目标",
        "status": "destroyed", "strategic_value": "A",
        "score": {
            "aci": 15, "dci": 13, "combatScore": 28,
            "scoreHistory": [78, 78, 78, 78, 30, 28, 28],
            "dailyData": {
                "dates": ["10/28", "10/29", "10/30", "10/31", "11/01", "11/02", "11/03"],
                "aci":   [75, 76, 77, 77, 75, 20, 18],
                "dci":   [68, 68, 69, 70, 68, 18, 15],
            },
            "equipment": [
                {"name": "机库 (2#已损毁)", "count": 3, "change": "-1",   "verified": True},
                {"name": "跑道 (有弹坑)",   "count": 1, "change": "受损", "verified": True},
            ],
            "imagery": [
                {"date": "2025-11-03", "label": "打击后",  "desc": "2号机库坍塌，跑道弹坑×3，车辆疏散",  "score": 0.97},
                {"date": "2025-10-31", "label": "打击前",  "desc": "设施完整，车辆活动正常",               "score": 0.95},
            ],
            "facilities": [
                {"name": "主机库(1#)",    "damage": 0,  "verified": True},
                {"name": "机库(2#受损)", "damage": 95, "verified": True},
                {"name": "主跑道",        "damage": 40, "verified": True},
                {"name": "指挥中心",      "damage": 60, "verified": False},
            ],
        },
    },
    {
        "id": "S4", "numeric_id": 66, "theater_id": "iran",
        "name": "霍尔木兹海峡监控区", "lat": 26.6, "lng": 56.4,
        "country": "伊朗/阿曼", "type": "海上监控点",
        "status": "operational", "strategic_value": "S",
        "score": {
            "aci": 92, "dci": 85, "combatScore": 70,
            "scoreHistory": [55, 58, 62, 68, 70, 70, 70],
            "dailyData": {
                "dates": ["10/28", "10/29", "10/30", "10/31", "11/01", "11/02", "11/03"],
                "aci":   [80, 82, 85, 88, 92, 92, 92],
                "dci":   [72, 74, 78, 82, 85, 85, 85],
            },
            "equipment": [
                {"name": "CVN-77 航母",         "count": 1, "change": "+1", "verified": True},
                {"name": "提康德罗加级巡洋舰",  "count": 2, "change": "+2", "verified": True},
                {"name": "阿利伯克级驱逐舰",    "count": 4, "change": "+4", "verified": False},
            ],
            "imagery": [
                {"date": "2025-11-02", "label": "对峙解除", "desc": "航母编队向东驶出，民船通行恢复",       "score": 0.82},
                {"date": "2025-11-01", "label": "集结中",   "desc": "航母及护卫舰群在海峡口徘徊",           "score": 0.93},
            ],
            "facilities": [
                {"name": "CVN-77 甲板", "damage": 0, "verified": True},
                {"name": "护卫编队",    "damage": 0, "verified": False},
            ],
        },
    },
    {
        "id": "S5", "numeric_id": 67, "theater_id": "iran",
        "name": "岸基导弹阵地(代号)", "lat": 27.1, "lng": 56.9,
        "country": "伊朗", "type": "导弹阵地",
        "status": "damaged", "strategic_value": "A",
        "score": {
            "aci": 55, "dci": 70, "combatScore": 65,
            "scoreHistory": [60, 60, 62, 63, 65, 65, 65],
            "dailyData": {
                "dates": ["10/28", "10/29", "10/30", "10/31", "11/01", "11/02", "11/03"],
                "aci":   [50, 51, 52, 53, 55, 55, 55],
                "dci":   [62, 64, 65, 68, 70, 70, 70],
            },
            "equipment": [
                {"name": "反舰导弹发射车", "count": 6, "change": "+6", "verified": True},
            ],
            "imagery": [
                {"date": "2025-11-01", "label": "激活状态", "desc": "6辆导弹发射车驶离遮蔽棚，展开部署", "score": 0.71},
            ],
            "facilities": [
                {"name": "发射车遮蔽棚", "damage": 0,  "verified": True},
                {"name": "雷达站",        "damage": 20, "verified": False},
            ],
        },
    },
    {
        "id": "S6", "numeric_id": 68, "theater_id": "iran",
        "name": "某扩建空军基地", "lat": 33.2, "lng": 44.3,
        "country": "伊拉克", "type": "扩建施工中",
        "status": "damaged", "strategic_value": "A",
        "score": {
            "aci": 62, "dci": 58, "combatScore": 71,
            "scoreHistory": [58, 60, 62, 65, 68, 70, 71],
            "dailyData": {
                "dates": ["10/15", "10/20", "10/25", "10/28", "10/30", "11/01", "11/03"],
                "aci":   [50, 53, 55, 58, 60, 61, 62],
                "dci":   [48, 50, 52, 54, 56, 57, 58],
            },
            "equipment": [
                {"name": "跑道 (延伸中)",   "count": 1, "change": "+400m", "verified": True},
                {"name": "重型工程机械",    "count": 8, "change": "施工",  "verified": True},
                {"name": "疑似新型雷达",    "count": 1, "change": "待核实","verified": False},
            ],
            "imagery": [
                {"date": "2025-11-01", "label": "当前状态", "desc": "跑道北段延伸400m，雷达天线疑似安装",  "score": 0.88},
                {"date": "2025-10-28", "label": "施工中期", "desc": "跑道延伸200m，工程机械活跃",          "score": 0.92},
                {"date": "2025-10-15", "label": "施工初期", "desc": "西侧出现工程车辆，土方作业",          "score": 0.88},
            ],
            "facilities": [
                {"name": "跑道(延伸中)",   "damage": 0, "verified": True},
                {"name": "新型雷达阵地",  "damage": 0, "verified": False},
                {"name": "工程施工区",    "damage": 0, "verified": True},
            ],
        },
    },
    # ── 日本专题 ──────────────────────────────────────────────
    {
        "id": "JS1", "numeric_id": 63, "theater_id": "japan",
        "name": "横须贺海军基地", "lat": 35.283, "lng": 139.667,
        "country": "日本", "type": "海军基地",
        "status": "operational", "strategic_value": "S",
        "score": {
            "aci": 90, "dci": 82, "combatScore": 88,
            "scoreHistory": [80, 82, 83, 85, 86, 87, 88],
            "dailyData": {
                "dates": ["10/30", "10/31", "11/01", "11/02", "11/03", "11/04", "11/05"],
                "aci":   [84, 85, 86, 87, 88, 89, 90],
                "dci":   [78, 79, 80, 80, 81, 82, 82],
            },
            "equipment": [
                {"name": "宙斯盾驱逐舰 DDG-173", "count": 1, "change": "出港", "verified": True},
                {"name": "核动力航母 CVN-76",     "count": 1, "change": "0",    "verified": True},
                {"name": "P-8A 海神巡逻机",       "count": 4, "change": "+1",   "verified": True},
                {"name": "MH-60R 海鹰直升机",     "count": 8, "change": "0",    "verified": False},
            ],
            "imagery": [
                {"date": "2025-11-05", "label": "DDG出港后", "desc": "CVN-76在泊，P-8A 4架可见，码头活动正常", "score": 0.94},
                {"date": "2025-11-01", "label": "满员状态",  "desc": "DDG-173在泊，全编制舰艇正常部署",         "score": 0.91},
                {"date": "2025-10-20", "label": "基线状态",  "desc": "舰队正常编制，无异常活动",                "score": 0.89},
            ],
            "facilities": [
                {"name": "主码头区",   "damage": 0, "verified": True},
                {"name": "舰载机坪",   "damage": 0, "verified": True},
                {"name": "弹药补给区", "damage": 0, "verified": True},
                {"name": "水下维修坞", "damage": 0, "verified": False},
            ],
        },
    },
    {
        "id": "JS2", "numeric_id": 102, "theater_id": "japan",
        "name": "三沢空军基地", "lat": 40.703, "lng": 141.368,
        "country": "日本", "type": "空军基地",
        "status": "operational", "strategic_value": "S",
        "score": {
            "aci": 85, "dci": 78, "combatScore": 79,
            "scoreHistory": [70, 72, 73, 75, 76, 78, 79],
            "dailyData": {
                "dates": ["10/31", "11/01", "11/02", "11/03", "11/04", "11/05", "11/06"],
                "aci":   [78, 79, 80, 81, 82, 84, 85],
                "dci":   [72, 73, 74, 75, 76, 77, 78],
            },
            "equipment": [
                {"name": "F-35A 闪电II",           "count": 14, "change": "+2",  "verified": True},
                {"name": "F-16 Fighting Falcon",   "count": 6,  "change": "0",   "verified": True},
                {"name": "AN/TPY-2 弹道导弹雷达",  "count": 1,  "change": "激活","verified": True},
                {"name": "E-3 望楼预警机",          "count": 2,  "change": "0",   "verified": False},
            ],
            "imagery": [
                {"date": "2025-11-06", "label": "紧急升空后", "desc": "F-35A 10架在停机坪，AN/TPY-2雷达开机状态", "score": 0.96},
                {"date": "2025-11-05", "label": "预警激活",   "desc": "雷达站异常辐射信号，F-35A戒备状态",        "score": 0.89},
                {"date": "2025-10-28", "label": "常规状态",   "desc": "F-35A 14架，F-16 6架，正常部署",           "score": 0.87},
            ],
            "facilities": [
                {"name": "主跑道",          "damage": 0, "verified": True},
                {"name": "F-35A加固机库",   "damage": 0, "verified": True},
                {"name": "AN/TPY-2雷达站",  "damage": 0, "verified": True},
                {"name": "联合作战中心",    "damage": 0, "verified": False},
            ],
        },
    },
    {
        "id": "JS3", "numeric_id": 103, "theater_id": "japan",
        "name": "那霸防空基地", "lat": 26.196, "lng": 127.646,
        "country": "日本 (沖绳)", "type": "防空基地",
        "status": "operational", "strategic_value": "A",
        "score": {
            "aci": 68, "dci": 88, "combatScore": 74,
            "scoreHistory": [65, 67, 68, 70, 71, 73, 74],
            "dailyData": {
                "dates": ["10/30", "10/31", "11/01", "11/02", "11/03", "11/04", "11/05"],
                "aci":   [60, 62, 63, 64, 65, 66, 68],
                "dci":   [80, 81, 82, 84, 85, 87, 88],
            },
            "equipment": [
                {"name": "PAC-3 爱国者导弹",  "count": 4,  "change": "展开", "verified": True},
                {"name": "F-15J 鹰式战斗机",  "count": 18, "change": "0",    "verified": True},
                {"name": "地对空导弹阵地",    "count": 3,  "change": "+1",   "verified": True},
                {"name": "警戒管制雷达",      "count": 2,  "change": "激活", "verified": True},
            ],
            "imagery": [
                {"date": "2025-11-05", "label": "PAC-3激活", "desc": "PAC-3发射架展开，F-15J 12架处于快速反应状态", "score": 0.91},
                {"date": "2025-11-01", "label": "常规状态",  "desc": "F-15J 18架在坪，防空阵地正常值班",           "score": 0.88},
            ],
            "facilities": [
                {"name": "主跑道",          "damage": 0, "verified": True},
                {"name": "PAC-3阵地",       "damage": 0, "verified": True},
                {"name": "F-15J机库",       "damage": 0, "verified": True},
                {"name": "指挥通信中心",    "damage": 0, "verified": True},
            ],
        },
    },
    {
        "id": "JS4", "numeric_id": 104, "theater_id": "japan",
        "name": "嘉手纳空军基地", "lat": 26.356, "lng": 127.768,
        "country": "日本 (沖绳)", "type": "美军空军基地",
        "status": "operational", "strategic_value": "S",
        "score": {
            "aci": 94, "dci": 86, "combatScore": 91,
            "scoreHistory": [85, 86, 87, 88, 89, 90, 91],
            "dailyData": {
                "dates": ["10/31", "11/01", "11/02", "11/03", "11/04", "11/05", "11/06"],
                "aci":   [88, 89, 89, 90, 91, 92, 94],
                "dci":   [82, 83, 83, 84, 85, 85, 86],
            },
            "equipment": [
                {"name": "F-22 猛禽战斗机",         "count": 6, "change": "+6 (TDY)", "verified": True},
                {"name": "KC-135 同温层油船",        "count": 4, "change": "0",        "verified": True},
                {"name": "RC-135 铆钉接头侦察机",   "count": 2, "change": "+1",        "verified": True},
                {"name": "HH-60G 铺路鹰",            "count": 3, "change": "0",        "verified": False},
            ],
            "imagery": [
                {"date": "2025-11-06", "label": "F-22部署后", "desc": "F-22 6架临时部署，跑道活动频繁",        "score": 0.95},
                {"date": "2025-11-02", "label": "部署前",     "desc": "KC-135 4架，RC-135 1架，正常编制",    "score": 0.92},
            ],
            "facilities": [
                {"name": "主跑道（双向）",       "damage": 0, "verified": True},
                {"name": "F-22临时机库",         "damage": 0, "verified": True},
                {"name": "空中加油站台",         "damage": 0, "verified": True},
                {"name": "侦察情报处理中心",     "damage": 0, "verified": False},
            ],
        },
    },
    {
        "id": "JS5", "numeric_id": 105, "theater_id": "japan",
        "name": "饭冢通信基地 (受损)", "lat": 33.641, "lng": 130.692,
        "country": "日本", "type": "通信/电子战",
        "status": "damaged", "strategic_value": "A",
        "score": {
            "aci": 30, "dci": 55, "combatScore": 41,
            "scoreHistory": [72, 72, 72, 72, 45, 43, 41],
            "dailyData": {
                "dates": ["10/29", "10/30", "10/31", "11/01", "11/02", "11/03", "11/04"],
                "aci":   [68, 69, 70, 70, 68, 40, 30],
                "dci":   [65, 66, 66, 67, 65, 58, 55],
            },
            "equipment": [
                {"name": "ELQ-1 对地监视雷达",  "count": 1, "change": "受损",   "verified": True},
                {"name": "超视距通信天线阵",     "count": 3, "change": "-1受损", "verified": True},
                {"name": "电子战支援设施",       "count": 1, "change": "停机",   "verified": False},
            ],
            "imagery": [
                {"date": "2025-11-04", "label": "事故后",  "desc": "天线阵1组倒塌，维修车辆进场，雷达停机", "score": 0.93},
                {"date": "2025-10-30", "label": "正常状态","desc": "天线阵3组正常运行，雷达值班",            "score": 0.90},
            ],
            "facilities": [
                {"name": "主天线阵(1#受损)", "damage": 85, "verified": True},
                {"name": "主天线阵(2#)",     "damage": 0,  "verified": True},
                {"name": "主天线阵(3#)",     "damage": 0,  "verified": True},
                {"name": "电子战中心",       "damage": 30, "verified": False},
            ],
        },
    },
    {
        "id": "JS6", "numeric_id": 106, "theater_id": "japan",
        "name": "佐世保海军基地", "lat": 33.158, "lng": 129.722,
        "country": "日本", "type": "海军基地",
        "status": "operational", "strategic_value": "A",
        "score": {
            "aci": 72, "dci": 79, "combatScore": 76,
            "scoreHistory": [68, 70, 71, 72, 74, 75, 76],
            "dailyData": {
                "dates": ["10/30", "10/31", "11/01", "11/02", "11/03", "11/04", "11/05"],
                "aci":   [66, 68, 69, 70, 71, 71, 72],
                "dci":   [73, 74, 75, 76, 77, 78, 79],
            },
            "equipment": [
                {"name": "两栖攻击舰 LHA", "count": 1,  "change": "0",  "verified": True},
                {"name": "宙斯盾驱逐舰",   "count": 3,  "change": "+1", "verified": True},
                {"name": "扫雷舰",         "count": 4,  "change": "0",  "verified": True},
                {"name": "MV-22 鱼鹰",    "count": 12, "change": "0",  "verified": False},
            ],
            "imagery": [
                {"date": "2025-11-05", "label": "当前状态", "desc": "LHA在泊，宙斯盾舰3艘，MV-22甲板可见",  "score": 0.88},
                {"date": "2025-10-28", "label": "出发前",   "desc": "DDG-180护卫舰返港加入编队",            "score": 0.85},
            ],
            "facilities": [
                {"name": "主码头",           "damage": 0, "verified": True},
                {"name": "两栖舰停泊区",     "damage": 0, "verified": True},
                {"name": "弹药装载区",       "damage": 0, "verified": True},
                {"name": "海上自卫队司令部", "damage": 0, "verified": False},
            ],
        },
    },
]


# ── 影像时间轴（geo_pos_id=63 对应 S1）────────────────────────
GEO_POS_IMAGES = [
    (78080, 63, 78614, "2026-03-15 13:32:57", 1),
    (78035, 63,78569, "2026-03-14 10:22:24", 1),
    (77892, 63,78426, "2026-03-12 11:42:04", 1),
    (77871, 63,78405, "2026-03-11 13:39:45", 1),
    (77848, 63,78382, "2026-03-10 15:24:47", 1),
    (77774, 63,78308, "2026-03-09 11:28:46", 1),
    (77733, 63,78267, "2026-03-08 11:41:26", 1),
    (77720, 63,78254, "2026-03-07 11:53:16", 1),
    (77685, 63,78219, "2026-03-05 13:38:23", 1),
    (77376, 63,77910, "2026-02-28 12:32:51", 1),
    (77147, 63,77681, "2026-02-23 11:43:28", 1),
    (77024, 63,77558, "2026-02-21 13:36:44", 1),
    (76959, 63,77493, "2026-02-19 12:21:15", 1),
    (76928, 63,77462, "2026-02-18 13:28:29", 1),
    (76762, 63,77296, "2026-02-15 13:31:10", 1),
    (76695, 63,77229, "2026-02-13 13:09:01", 1),
    (76633, 63,77167, "2026-02-12 12:03:27", 1),
    (76471, 63,77005, "2026-02-09 12:36:27", 1),
    (75799, 63,76333, "2026-02-06 12:26:53", 1),
    (75662, 63,76196, "2026-02-04 11:34:28", 1),
    (75620, 63,76154, "2026-02-03 11:47:04", 1),
    (75419, 63,75953, "2026-02-02 11:43:15", 1),
    (75405, 63,75939, "2026-02-01 13:07:41", 1),
    (75262, 63,75796, "2026-01-30 11:56:49", 1),
    (75213, 63,75747, "2026-01-29 11:58:28", 1),
    (75070, 63,75604, "2026-01-26 11:46:06", 1),
    (74931, 63,75465, "2026-01-23 11:31:32", 1),
    (74951, 63,75485, "2026-01-24 11:44:11", 1),
    (74645, 63,75179, "2026-01-18 11:16:48", 1),
    (74574, 63,75108, "2026-01-17 13:40:27", 1),
    (74508, 63,75042, "2026-01-16 11:27:13", 1),
    (74455, 63,74989, "2026-01-14 12:29:39", 1),
    (74382, 63,74916, "2026-01-13 12:11:03", 1),
    (74333, 63,74867, "2026-01-12 13:38:07", 1),
    (74174, 63,74708, "2026-01-11 11:54:44", 1),
    (74127, 63,74661, "2026-01-10 11:46:56", 1),
    (73939, 63,74473, "2026-01-06 13:14:14", 1),
    (73899, 63,74433, "2026-01-05 11:02:20", 1),
    (73858, 63,74392, "2026-01-01 12:20:16", 1),
    (73828, 63,74362, "2026-01-01 11:37:44", 1),
    (73812, 63,74346, "2025-12-31 11:36:46", 1),
    (73768, 63,74302, "2025-12-30 12:20:18", 1),
    (73677, 63,74211, "2025-12-29 09:57:00", 1),
    (73669, 63,74203, "2025-12-28 13:03:49", 1),
]


def init_db(conn):
    conn.executescript(DDL)
    conn.commit()
    print("[OK] tables created")


def seed_theaters(conn):
    conn.execute("DELETE FROM theater")
    for t in THEATERS:
        conn.execute(
            "INSERT INTO theater (id, label, label_en, flag, camera_json) VALUES (?, ?, ?, ?, ?)",
            (t["id"], t["label"], t["label_en"], t["flag"], json.dumps(t["camera"], ensure_ascii=False)),
        )
    conn.commit()
    print(f"[OK] theaters: {len(THEATERS)}")


def seed_sites(conn):
    conn.execute("DELETE FROM geo_pos")
    for s in SITES:
        conn.execute(
            """INSERT INTO geo_pos
               (id, numeric_id, theater_id, name, lat, lng, country, type, status, strategic_value, score_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                s["id"], s["numeric_id"], s["theater_id"],
                s["name"], s["lat"], s["lng"],
                s["country"], s["type"], s["status"], s["strategic_value"],
                json.dumps(s["score"], ensure_ascii=False),
            ),
        )
    conn.commit()
    print(f"[OK] sites: {len(SITES)}")


def seed_timeline(conn):
    conn.execute("DELETE FROM geo_pos_image")
    conn.executemany(
        "INSERT INTO geo_pos_image (id, geo_pos_id, image_id, create_time, available) VALUES (?, ?, ?, ?, ?)",
        GEO_POS_IMAGES,
    )
    conn.commit()
    print(f"[OK] timeline: {len(GEO_POS_IMAGES)}")


if __name__ == "__main__":
    conn = sqlite3.connect(DB_PATH)
    try:
        init_db(conn)
        seed_theaters(conn)
        seed_sites(conn)
        seed_timeline(conn)
        print(f"\nDB ready: {DB_PATH}")
    finally:
        conn.close()
