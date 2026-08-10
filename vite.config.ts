import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 现在有两个服务器
  // 前端 vite  http://localhost:5173
  // 后端 Express  http://localhost:8787
  // 因此，如果前端写fetch("/api/health") ,浏览器默认访问前端接口
  // 需要vite proxy转发：发现请求路径以api开头则直接转发到8787
  // 不需要浏览器跨域请求
  server: {
    proxy: {
      "/api": {
        target:
          "http://localhost:8787",
          // 转发请求时，将请求里的origin/host调整为目标服务器更能接受的模式
          // 提高兼容性
        changeOrigin: true,
      },
    },
  },
});
