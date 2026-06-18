# Markline

FFXIV ACT 네트워크 로그에서 **머리 사인 마커(징)** 의 부착·이동·교체·제거 이력을 시간순 타임라인으로 보여주는 웹 뷰어입니다. *누가 언제 내 표식을 옮기거나 지웠는지* 한눈에 확인할 수 있습니다.

**🔗 https://pnsdh.github.io/Markline/**

## 특징

- **전투 구간별 정리** — 전투마다 묶어 보여주고, 각 구간에 동작이 언제 일어났는지 미니 타임라인으로 표시
- **실시간 추적** (Chromium 계열) — 로그 폴더를 열어두면 게임에서 표식이 찍히는 순간 반영되고, 날짜가 바뀌어 새 로그가 생기면 자동 전환
- **검색 · 동작 필터**(이동/제거/교체/부착) · **내 캐릭터만** 보기
- **맥락 보기** — 필터 중인 항목에서 전체 타임라인의 그 지점으로 점프했다가 되돌아오기
- **한국어 · English · 日本語**, 다크/라이트 테마
- **비공개 모드** — 다른 플레이어 닉네임을 "플레이어 N"으로 가림(스트리밍/스크린샷용)
- 데스크톱 도구와 동일한 형식으로 **복사**

## 개인정보

**완전히 브라우저 안에서만 동작합니다.** 로그 파일은 어떤 외부 서버로도 전송되지 않고(분석·추적·외부 API 호출 없음), 파일 내용은 저장되지 않습니다. 화면 설정만 브라우저 로컬에 보관됩니다. 폰트·아이콘 등 모든 리소스는 앱 자체에 번들되어 같은 출처에서만 불러옵니다.

## 브라우저 지원

- **로그 파일 열기·분석**: 모든 최신 브라우저
- **실시간 추적·폴더 자동전환**: File System Access API를 지원하는 브라우저(Chrome · Edge 등 Chromium 계열)

## 개발

```bash
npm install
npm run dev            # 개발 서버 (http://localhost:5173)
npm run build          # 타입체크 + 프로덕션 빌드 → dist/
npm test               # 단위 테스트 (파싱 골든 검증)
npx playwright test    # e2e 테스트
```

데스크톱 원본과의 파싱 동등성은 `test/fixtures/`의 골든 픽스처로 검증합니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 빌드 후 GitHub Pages로 자동 배포합니다.

> 최초 1회: 저장소 **Settings → Pages → Source** 를 **"GitHub Actions"** 로 설정해야 합니다.

## 라이선스 / 고지

- 코드 라이선스: **[MIT](LICENSE)**
- 폰트: **[Pretendard](https://github.com/orioncactus/pretendard)**(한글·라틴) + **[Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP)**(일본어 한자·가나) — 둘 다 SIL OFL 1.1, 번들. 일본어는 사용 시에만 동적 로딩.
- **FINAL FANTASY XIV © SQUARE ENIX CO., LTD.** 마커 아이콘 등 게임 내 리소스의 저작권은 Square Enix에 있으며, 팬 콘텐츠 가이드라인에 따라 사용합니다. 본 도구는 Square Enix와 무관한 **비공식 팬 제작물**입니다.
