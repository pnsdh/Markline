/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // 데스크톱 ThemeManager 팔레트를 CSS 변수로 토큰화 (다크/라이트 전환).
      // 실제 색 값은 src/ui/theme.css 의 :root / .dark 에서 정의.
      colors: {
        mk: {
          window: 'rgb(var(--mk-window) / <alpha-value>)',
          header: 'rgb(var(--mk-header) / <alpha-value>)',
          panel: 'rgb(var(--mk-panel) / <alpha-value>)',
          card: 'rgb(var(--mk-card) / <alpha-value>)',
          'card-hover': 'rgb(var(--mk-card-hover) / <alpha-value>)',
          border: 'rgb(var(--mk-border) / <alpha-value>)',
          text: 'rgb(var(--mk-text) / <alpha-value>)',
          'text-sub': 'rgb(var(--mk-text-sub) / <alpha-value>)',
          'text-faint': 'rgb(var(--mk-text-faint) / <alpha-value>)',
          accent: 'rgb(var(--mk-accent) / <alpha-value>)',
          'accent-soft': 'rgb(var(--mk-accent-soft) / <alpha-value>)',
          'accent-btn': 'rgb(var(--mk-accent-btn) / <alpha-value>)',
          'row-mine': 'rgb(var(--mk-row-mine) / <alpha-value>)',
        },
      },
      fontFamily: {
        // Pretendard 가 한글·라틴·가나를 처리하고, 미수록 한자는 번들된 Noto Sans JP 가 처리한다.
        // (Pretendard 한자 0자 → 번들 Noto JP 로 일관 렌더, 시스템 일본어 폰트는 최후 폴백)
        sans: [
          'Pretendard Variable',
          'Pretendard',
          'Noto Sans JP Variable', // 번들 일본어 한자·가나 (동적 서브셋)
          'Noto Sans JP',
          'Hiragino Kaku Gothic ProN', // 최후 폴백 — 시스템 일본어 폰트
          'Yu Gothic UI',
          'Meiryo',
          'Segoe UI Variable Text',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
