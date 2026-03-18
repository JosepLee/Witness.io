import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumBaseUrl = "cesiumStatic";

export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}`),
  },

  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl },
      ],
    }),
  ],

  server: {
    proxy: {
      "/worldmap": {
        target: "http://124.70.78.85:9998",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/worldmap/, ""),
      },

      "/targetpointmap": {
        target: `http://${process.env.TARGET_SERVICE_ADDRESS || "124.70.78.85"}:${process.env.TARGET_SERVICE_PORT || "9998"}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/targetpointmap/, ""),
      },
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
