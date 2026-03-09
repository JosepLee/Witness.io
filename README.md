# SATINT Demo · 启动指南

## 环境要求
- Node.js 18+
- npm 9+

## 启动

```bash
npm install
npm run dev
```

打开 http://localhost:5173

## 三个模块

| 路由 | 模块 | 负责人 |
|------|------|--------|
| `/` | 信实链·事件链图谱 | 你 |
| `/site` | 点位包·基地地图 | 前端同事A |
| `/report` | 综合报告·动态演示 | 前端同事B |

## 数据层
所有 mock 数据在 `src/data/mockData.js`，三个模块共用，修改数据不需要改组件。

## 模块间跳转
- 信实链：点击绿色（已验证）节点 → 详情面板 → "查看点位包影像" → 跳转 /site/:siteId
- 路由参数 siteId 对应 mockData.js 中 SITES 的 id 字段

## 各模块待完善
- **信实链**：可继续增加跨链动画、链级置信度动态更新效果
- **点位包**：接入真实 Leaflet WMTS 图层替换占位符
- **报告**：可升级为 CesiumJS 三维地球，接入真实飞机轨迹动画
