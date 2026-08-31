import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages는 https://<user>.github.io/<repo>/ 하위 경로로 서빙되므로 base를 repo 이름으로 맞춘다.
  base: '/ai-trust-checker/',    
  plugins: [react(), tailwindcss()],
    // Vitest는 src/lib의 순수 함수만 테스트하므로 브라우저(jsdom) 없이 node 환경이면 충분하다.
    test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    },
})
