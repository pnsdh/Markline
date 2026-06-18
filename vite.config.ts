import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// 상대 경로(base: './')로 빌드하면 GitHub Pages 프로젝트 사이트의
// 어떤 하위 경로(/리포명/)에서도 에셋 URL이 깨지지 않는다.
// (단위 테스트 설정은 vitest.config.ts 에 분리)

// 콘텐츠 보안 정책 — 앱은 외부 요청·eval·인라인 스크립트가 없어 'self' 기반으로 충분하다.
// style 'unsafe-inline' 은 framer-motion·인라인 색상 스타일 때문에 필요.
// 워커는 모듈 워커(자기 출처) + 구형 브라우저용 blob 폴백 대비 blob: 도 허용.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

// CSP 메타 태그는 빌드 산출물에만 주입한다. (개발 서버의 HMR 인라인 스크립트를 깨뜨리지 않도록)
function cspMeta(): Plugin {
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }];
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), cspMeta()],
  worker: {
    format: 'es',
  },
});
