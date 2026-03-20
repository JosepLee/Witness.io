import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumBaseUrl = "cesiumStatic";

// 卫星影像服务地址（直接访问，不走代理）
// 可在 .env.local 中配置：
//   VITE_SATELLITE_ADDRESS=1.94.249.221
//   VITE_SATELLITE_PORT=8095
const satelliteHost = process.env.VITE_SATELLITE_ADDRESS || "1.94.249.221";
const satellitePort = process.env.VITE_SATELLITE_PORT    || "8095";

export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}`),
    // 将卫星服务地址注入到前端代码，供 getSatUrl 使用
    __SAT_HOST__: JSON.stringify(satelliteHost),
    __SAT_PORT__: JSON.stringify(satellitePort),
  },

  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Workers`,    dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Assets`,     dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Widgets`,    dest: cesiumBaseUrl },
      ],
    }),
  ],

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
      "/worldmap": {
        target: "http://124.70.78.85:9998",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/worldmap/, ""),
      },
      // /targetpointmap 已移除，前端直接访问真实 IP:port
      "/tianditu-proxy": {
        target: "https://t0.tianditu.gov.cn",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tianditu-proxy/, ""),
      },
    },
  },

  optimizeDeps: {
    include: ["cesium"],
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          cesium: ["cesium"],
        },
      },
    },
  },
});