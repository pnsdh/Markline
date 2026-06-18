import { defineConfig } from 'vitest/config';

// 단위 테스트 전용 설정 (test/ 폴더만). e2e/*.spec.ts(Playwright)는 vitest가 건드리지 않게 한다.
// 코어/IO 테스트는 순수 TS라 react 플러그인이 필요 없으므로 vite.config 와 분리.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
