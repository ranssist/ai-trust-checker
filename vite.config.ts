import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vitest는 src/lib의 순수 함수만 테스트하므로 브라우저(jsdom) 없이 node 환경이면 충분하다.
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
