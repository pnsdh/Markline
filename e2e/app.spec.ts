import { test, expect } from '@playwright/test';
import path from 'node:path';

const LOG = path.resolve('test/fixtures/sample1.log');
const SHOTS = 'e2e/shots';

// 숨겨진 file input 에 직접 주입 → 네이티브 파일 다이얼로그를 거치지 않고 정적 분석 경로로 로드.
async function loadLog(page: import('@playwright/test').Page) {
  await page.locator('input[type=file]').first().setInputFiles(LOG);
  await page.waitForSelector('[data-testid=event-row]', { timeout: 15_000 });
}

async function setTheme(page: import('@playwright/test').Page, label: '다크' | '라이트') {
  await page.getByTitle('테마 선택').click();
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(400); // 트랜지션
}

test('스모크: 로드 + 렌더 + 상태별 스크린샷', async ({ page }) => {
  await page.goto('/');

  // 1) 시작 화면
  await expect(page.getByText('ACT 전투 로그를 열어주세요')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/01-start.png` });

  // 2) 로그 로드
  await loadLog(page);
  const rows = page.locator('[data-testid=event-row]');
  expect(await rows.count()).toBeGreaterThan(10);
  await expect(page.getByText('곰쥬', { exact: false }).first()).toBeVisible();

  // 3) 라이트→다크 전환 '중간 프레임' — 흰색으로 확 밝아지지 않아야 함(라이트에서 갈 때가 특히 문제였음)
  await setTheme(page, '라이트');
  await page.getByTitle('테마 선택').click();
  await page.getByRole('button', { name: '다크', exact: true }).click();
  await page.waitForTimeout(120); // 전환(0.26s)의 중간쯤
  await page.screenshot({ path: `${SHOTS}/15-theme-mid.png` });
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${SHOTS}/02-dark.png` });

  // 3.5) 스크롤 중 구간 헤더가 겹치지 않음 (각 헤더는 자기 섹션 안에서만 sticky)
  await page.evaluate(() => {
    const row = document.querySelector('[data-testid=event-row]');
    const sc = row?.closest('.overflow-y-auto') as HTMLElement | null;
    if (sc) sc.scrollTop = 820;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/14-scroll-headers.png` });
  await page.evaluate(() => {
    const row = document.querySelector('[data-testid=event-row]');
    const sc = row?.closest('.overflow-y-auto') as HTMLElement | null;
    if (sc) sc.scrollTop = 0;
  });
  await setTheme(page, '라이트');
  await page.screenshot({ path: `${SHOTS}/03-light.png` });

  // 4) 영어 전환
  await page.getByTitle('언어 선택').click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/04-english.png` });
  // 다시 한국어
  await page.getByTitle('Select language').click();
  await page.getByRole('button', { name: '한국어', exact: true }).click();
  await page.waitForTimeout(200);

  // 5) 비공개(익명화) — 타임라인 툴바의 닉네임 비공개 토글
  await page.locator('button[title^="닉네임"]').click();
  await page.waitForTimeout(200);
  await expect(page.getByText('플레이어', { exact: false }).first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/05-privacy.png` });
  await page.locator('button[title^="닉네임"]').click(); // 끄기

  // 6) 구간 선택 (첫 구간 카드)
  const segCards = page.locator('[data-testid=seg-card]');
  if ((await segCards.count()) > 0) {
    await segCards.first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/06-segment.png` });
  }

  // 7) 검색
  await page.getByPlaceholder('이름·표식·동작 검색').fill('교체');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/07-search.png` });
  await page.getByPlaceholder('이름·표식·동작 검색').fill('');
});

test('행 복사: 호버 복사 버튼 → 클립보드', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await loadLog(page);
  const row = page.locator('[data-testid=event-row]').first();
  await row.hover();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/10-row-hover-copy.png` });
  await row.getByRole('button').first().click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/); // 시각(ms 포함) — 표시와 동일
  expect(text).toContain('부착');
});

test('바로가기/뒤로가기: 필터 중 행 → 맥락 보기 → 복귀', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await loadLog(page);
  // 와이드: 풀폭 헤더/푸터 + 가운데 본문
  await page.screenshot({ path: `${SHOTS}/11-wide.png` });

  // 검색으로 필터링
  const search = page.getByPlaceholder('이름·표식·동작 검색');
  await search.fill('교체');
  await page.waitForTimeout(250);

  // 첫 행 호버 → 바로가기(Crosshair) 클릭
  const row = page.locator('[data-testid=event-row]').first();
  await row.hover();
  const goto = row.locator('button[title^="이 지점으로"]');
  await expect(goto).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/13-row-goto-hover.png` }); // 크로스헤어+복사 동일 서식
  await goto.click();
  await page.waitForTimeout(300);

  // 필터 해제(검색 비움) + 뒤로가기 노출
  await expect(search).toHaveValue('');
  const back = page.locator('button[title^="바로가기 전"]');
  await expect(back).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/12-goto.png` });

  // 뒤로가기 → 검색 복원
  await back.click();
  await page.waitForTimeout(300);
  await expect(search).toHaveValue('교체');
  await expect(page.locator('button[title^="바로가기 전"]')).toHaveCount(0);
});

test('오류 화면: 로드 실패 시 본문에 안내 + 복구 버튼', async ({ page }) => {
  await page.goto('/');
  // DEV 전용 store 핸들로 오류 상태 주입(잘못된 폴더 등은 네이티브 피커라 자동화 불가)
  await page.evaluate(() => {
    const s = (window as unknown as { mkStore?: { setState: (p: object) => void } }).mkStore;
    s?.setState({ status: 'error', eventCount: 0, error: '이 폴더에 로그 파일(.log)이 없습니다.' });
  });
  await expect(page.getByText('로그를 열 수 없습니다')).toBeVisible();
  // 본문(에러 화면)과 상태바 양쪽에 메시지 노출 → 본문 쪽만 정확히 매칭
  await expect(page.getByText('이 폴더에 로그 파일(.log)이 없습니다.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '로그 파일 선택' })).toBeVisible();
});

test('반응형: 모바일 뷰포트', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await loadLog(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/08-mobile.png`, fullPage: false });

  // 검색 포커스 → 검색창이 전폭으로 확장(토글 묶음을 덮음), 블러 시 복귀
  const mSearch = page.getByPlaceholder('이름·표식·동작 검색');
  await mSearch.focus();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/16-mobile-search-focus.png`, fullPage: false });
  await expect(page.locator('button[title^="전투 종료 후"]')).toBeHidden(); // 토글 묶음 숨김 확인
  await mSearch.blur();
  await page.waitForTimeout(150);
  await expect(page.locator('button[title^="전투 종료 후"]')).toBeVisible(); // 복귀

  // 구간 드로어: 햄버거로 열기 (드로어는 motion.aside, 데스크톱 aside는 display:none)
  const drawer = page.locator('aside:visible');
  await page.getByTitle('전투 구간').click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('전체 보기')).toBeVisible();
  await page.waitForTimeout(450); // 슬라이드 인 완료
  await page.screenshot({ path: `${SHOTS}/09-mobile-drawer.png`, fullPage: false });
  // 구간 선택 → 드로어 닫힘
  await drawer.locator('[data-testid=seg-card]').first().click();
  await expect(page.locator('aside:visible')).toHaveCount(0);
});
