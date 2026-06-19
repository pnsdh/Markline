import { Lang } from './loc';

/**
 * 모든 문자열을 (한국어, 영어, 일본어) 나란히 관리하는 한 곳.
 * 데스크톱 LocStrings.cs 의 표를 그대로 옮긴 것. 새 문자열은 여기 키와 3개 언어를 추가.
 */
type Triple = readonly [ko: string, en: string, ja: string];

const MAP: Record<string, Triple> = {
  // ── 상단 바 / 버튼 ──────────────────────────────
  open_log: ['로그 파일 열기', 'Open Log File', 'ログファイルを開く'],
  live_track: ['실시간 추적', 'Live Tracking', 'リアルタイム追跡'],

  // ── 좌측 패널 ──────────────────────────────────
  combat_sections: ['전투 구간', 'Encounters', '戦闘区間'],
  all_view: ['전체 보기', 'All', 'すべて'],
  lbl_markers: ['표식', 'Markers', '印'],
  lbl_actions: ['조작', 'Actions', '操作'],
  mychar_label: ['내 캐릭터', 'My character', '自分'],
  tip_live_track: [
    'ACT 로그 폴더를 선택해 실시간 추적 — 최신 로그를 열고, 날짜가 바뀌거나 ACT를 재시작해 새 로그가 생겨도 자동으로 따라갑니다.',
    'Pick your ACT log folder for live tracking — opens the latest log and follows new ones (date change / ACT restart).',
    'ACTログフォルダを選んでリアルタイム追跡 — 最新ログを開き、日付変更やACT再起動で新しいログができても自動追従します。',
  ],
  tip_open_file: [
    '로그 파일 하나를 열어 봅니다 — 실시간 추적·자동 전환 없음(과거 전투 리뷰용).',
    'Open a single log file — no live tracking or auto-switch (for reviewing past fights).',
    'ログファイルを1つ開きます — リアルタイム追跡・自動切替なし（過去の戦闘確認用）。',
  ],
  cat_attack: ['공격', 'Attack', '攻撃'],
  cat_bind: ['속박', 'Bind', '足止め'],
  cat_ignore: ['금지', 'Ignore', '禁止'],
  cat_shape: ['도형', 'Shape', '図形'],
  rail_compact: ['압축 보기', 'Compact', 'コンパクト表示'],
  rail_comfortable: ['넓게 보기', 'Comfortable', 'ゆったり表示'],
  opt_hide_idle: ['대기 구간 숨기기', 'Hide idle sections', '待機区間を隠す'],
  opt_hide_postcombat: ['전투 종료 후 정리 숨기기', 'Hide post-combat cleanup', '戦闘終了後の整理を隠す'],

  // ── 검색 / 필터 ────────────────────────────────
  search_ph: ['이름·표식·동작 검색', 'Search name · marker · action', '名前・印・動作で検索'],
  only_mine: ['내 캐릭터만', 'Only me', '自分のみ'],
  reset_chips: ['초기화', 'Reset', 'リセット'],
  tip_reset_chips: ['선택한 필터 모두 해제', 'Clear all selected filters', '選択したフィルターをすべて解除'],
  opt_highlight_off: ['내 닉네임 강조 끄기', "Don't highlight my name", '自分の名前を強調しない'],
  tip_goto: ['이 지점으로 이동 (필터 해제하고 전후 맥락 보기)', 'Jump here (clear filters, see in context)', 'この地点へ移動（フィルター解除して前後を表示）'],
  nav_back: ['이전 검색으로', 'Back to search', '検索に戻る'],
  tip_nav_back: ['바로가기 전의 검색·스크롤 상태로 복귀', 'Return to the search/scroll before jumping', 'ジャンプ前の検索・スクロール状態に戻る'],

  // ── 시작 화면 ──────────────────────────────────
  empty_title: ['ACT 전투 로그를 열어주세요', 'Open an ACT combat log', 'ACT戦闘ログを開いてください'],
  empty_desc: [
    '로그에 기록된 머리 표식(공격·속박·금지·도형)의\n부착·제거·이동을 시간순으로 보여줍니다.',
    'Shows sign markers (attack, bind, ignore, shapes)\nbeing placed, removed, and moved over time.',
    'ログに記録された頭の印（攻撃・足止め・禁止・図形）の\n設置・解除・移動を時系列で表示します。',
  ],
  error_title: ['로그를 열 수 없습니다', "Couldn't open the log", 'ログを開けませんでした'],
  crash_title: ['문제가 발생했습니다', 'Something went wrong', '問題が発生しました'],
  crash_desc: [
    '예기치 못한 오류로 화면을 표시할 수 없습니다. 페이지를 새로고침해 주세요.',
    'An unexpected error prevented the page from rendering. Please reload.',
    '予期しないエラーで画面を表示できません。ページを再読み込みしてください。',
  ],
  crash_reload: ['새로고침', 'Reload', '再読み込み'],
  empty_drag: [
    '로그 파일을 이 창으로 끌어다 놓아도 됩니다',
    'You can also drag a log file onto this window',
    'ログファイルをこのウィンドウにドラッグしても開けます',
  ],
  loading: ['로그 읽는 중…', 'Loading log…', 'ログを読み込み中…'],
  loading_pct: ['로그 읽는 중… {0:0}%', 'Loading log… {0:0}%', 'ログを読み込み中… {0:0}%'],

  // ── 빈 목록 안내 ───────────────────────────────
  no_events_filtered: [
    '조건에 맞는 기록이 없습니다 (검색·필터를 확인해주세요)',
    'No records match (check the search/filter)',
    '条件に合う記録がありません（検索・フィルターを確認してください）',
  ],
  no_events_none: ['이 로그에는 머리 표식 기록이 없습니다', 'This log has no sign-marker records', 'このログには頭の印の記録がありません'],
  empty_live_hint: [
    '실시간 감시 중이라면 게임에서 표식이 찍히는 순간 여기에 나타납니다',
    "If watching live, markers appear here the moment they're placed in-game",
    'リアルタイム監視中なら、ゲームで印が付いた瞬間にここに表示されます',
  ],
  tip_onlymine: ['내 캐릭터가 관련된 기록만 표시', 'Show only records involving me', '自分が関係する記録のみ表示'],

  // ── 상태 표시줄 ────────────────────────────────
  status_live: ['실시간 감시 중', 'Watching (live)', 'リアルタイム監視中'],
  status_live_idle: ['감시 중 (새 기록 대기)', 'Watching (waiting for new records)', '監視中（新しい記録を待機）'],
  status_idle: ['대기 중', 'Idle', '待機中'],
  status_mychar: ['내 캐릭터: {0} · ', 'My character: {0} · ', '自分: {0} · '],
  status_events: ['표식 이벤트 {0}건 · {1}', '{0} marker events · {1}', '印イベント {0}件 · {1}'],
  status_lastrec: ['마지막 기록 {0}', 'last record {0}', '最終記録 {0}'],
  status_norec: ['기록 없음', 'no records', '記録なし'],
  status_error: ['오류: {0}', 'Error: {0}', 'エラー: {0}'],
  count_shown: ['표시 {0}건', '{0} shown', '{0}件 表示'],
  count_n: ['{0}건', '{0}', '{0}件'],
  copied: ['✓ {0}건 복사됨', '✓ {0} copied', '✓ {0}件 コピー'],

  // ── 폴더 안내 / 대화상자 ────────────────────────
  folder_remembered: ['기억된 로그 폴더: {0}', 'Remembered log folder: {0}', '記憶したログフォルダ: {0}'],
  folder_hint: [
    '로그 파일을 한 번 열면 그 폴더를 기억해,\n다음부터 ‘최신 로그 열기’로 바로 불러옵니다',
    'Open a log once and the folder is remembered,\nso ‘Open Latest Log’ works next time',
    'ログを一度開くとそのフォルダを記憶し、\n次回から「最新ログを開く」ですぐ読み込めます',
  ],
  dlg_open_title: ['ACT 네트워크 로그 파일 선택', 'Select ACT network log file', 'ACTネットワークログファイルを選択'],
  dlg_no_log_in_folder: [
    '이 폴더에 로그 파일(.log)이 없습니다.\n{0}\n\n다른 폴더의 로그를 직접 열어보세요.',
    'No log files (.log) in this folder.\n{0}\n\nTry opening a log from another folder.',
    'このフォルダにログファイル(.log)がありません。\n{0}\n\n別のフォルダのログを開いてください。',
  ],
  dlg_clipboard_fail: [
    '클립보드 복사에 실패했습니다. 다시 시도해주세요.',
    'Failed to copy to clipboard. Please try again.',
    'クリップボードへのコピーに失敗しました。もう一度お試しください。',
  ],
  app_name: ['Markline', 'Markline', 'Markline'],

  // ── 컨텍스트 메뉴 ──────────────────────────────
  ctx_copy_selected: ['선택한 항목 복사', 'Copy selected', '選択項目をコピー'],
  ctx_copy_all: ['전체 복사', 'Copy all', 'すべてコピー'],
  ctx_select_all: ['전체 선택', 'Select all', 'すべて選択'],

  // ── 툴팁 ──────────────────────────────────────
  tip_copy: [
    '표시된 목록 전체를 클립보드로 복사 (각 행·구간에 마우스를 올리면 그 부분만 복사)',
    'Copy the whole shown list to clipboard (hover a row or section to copy just that part)',
    '表示中のリスト全体をクリップボードにコピー（各行・区間にカーソルを合わせるとその分だけコピー）',
  ],
  tip_theme: ['테마 선택', 'Select theme', 'テーマを選択'],
  theme_system: ['시스템 설정 따름', 'Follow system', 'システム設定に従う'],
  theme_light: ['라이트', 'Light', 'ライト'],
  theme_dark: ['다크', 'Dark', 'ダーク'],
  tip_lock_on: [
    '최신 기록을 따라가는 중 — 새 기록이 오면 맨 아래로 스크롤 (클릭: 스크롤 잠금)',
    'Following latest — scrolls to newest on new records (click: lock scroll)',
    '最新を追従中 — 新しい記録が来ると末尾へスクロール（クリック: スクロール固定）',
  ],
  tip_lock_off: [
    '스크롤 잠금 — 새 기록이 와도 보던 위치를 유지 (클릭: 최신 따라가기)',
    'Scroll locked — keeps your position on new records (click: follow latest)',
    'スクロール固定 — 新しい記録が来ても表示位置を維持（クリック: 最新を追従）',
  ],
  tip_privacy_on: [
    "닉네임 비공개 중 — 플레이어 이름을 '플레이어 N'으로 표시 (클릭: 공개)",
    "Names hidden — players shown as 'Player N' (click: show)",
    'ニックネーム非公開中 — プレイヤー名を「プレイヤーN」で表示（クリック: 公開）',
  ],
  tip_privacy_off: [
    "닉네임 공개 — 클릭하면 플레이어 이름을 '플레이어 N'으로 가립니다",
    "Names shown — click to hide players as 'Player N'",
    'ニックネーム公開 — クリックでプレイヤー名を「プレイヤーN」に隠します',
  ],
  tip_segsort_on: ['전투 순서: 최신이 위 (클릭: 오래된 순)', 'Encounters: newest first (click: oldest first)', '戦闘順: 新しい順（クリック: 古い順）'],
  tip_segsort_off: ['전투 순서: 오래된 순 (클릭: 최신이 위)', 'Encounters: oldest first (click: newest first)', '戦闘順: 古い順（クリック: 新しい順）'],
  tip_eventsort_on: ['표식 순서: 최신이 위 (클릭: 오래된 순)', 'Markers: newest first (click: oldest first)', '印の順: 新しい順（クリック: 古い順）'],
  tip_eventsort_off: ['표식 순서: 오래된 순 (클릭: 최신이 위)', 'Markers: oldest first (click: newest first)', '印の順: 古い順（クリック: 新しい順）'],
  tip_latest_hint: [
    '이 폴더에서 가장 최근 로그를 열고, 새 로그가 생기면 자동으로 따라갑니다:\n{0}',
    'Opens the latest log in this folder and follows new logs automatically:\n{0}',
    'このフォルダの最新ログを開き、新しいログができると自動で追従します:\n{0}',
  ],
  tip_latest_none: [
    '아직 폴더가 정해지지 않았습니다. 로그 파일을 한 번 열면 그 폴더를 기억합니다.',
    'No folder set yet. Open a log file once to remember its folder.',
    'フォルダ未設定です。ログを一度開くとそのフォルダを記憶します。',
  ],
  resume_watch: ['이어서 감시: {0}', 'Resume watching: {0}', '監視を再開: {0}'],
  fs_unsupported: [
    '이 브라우저는 실시간 추적을 지원하지 않습니다. 로그 파일을 열어 분석은 할 수 있지만, 자동 갱신·폴더 자동 전환은 Chrome·Edge 등 크로미엄 브라우저에서만 동작합니다.',
    'This browser doesn’t support live tracking. You can still open a log to analyze it, but auto-refresh and folder auto-switch only work in Chromium browsers (Chrome, Edge).',
    'このブラウザはリアルタイム監視に対応していません。ログを開いて分析はできますが、自動更新・フォルダ自動切替は Chromium 系（Chrome・Edge）でのみ動作します。',
  ],
  tip_lang: ['언어 선택', 'Select language', '言語を選択'],
  lang_auto: ['자동 (시스템)', 'Auto (system)', '自動（システム）'],
  tip_autoopen_on: [
    '시작 시 최신 로그 자동 열기: 켜짐 — 마지막에 연 폴더의 가장 최근 로그를 엽니다 (클릭: 끄기)',
    'Auto-open latest on startup: on — opens the newest log in your last folder (click: turn off)',
    '起動時に最新ログを自動で開く: オン — 最後に開いたフォルダの最新ログを開きます（クリック: オフ）',
  ],
  tip_autoopen_off: [
    '시작 시 최신 로그 자동 열기 — 마지막에 연 로그 폴더의 가장 최근 .log를 매번 엽니다. 켜면 폴더를 한 번 선택합니다.',
    "Auto-open latest on startup — opens the newest .log in your last log folder. Picks a folder when you turn it on.",
    '起動時に最新ログを自動で開く — 最後に開いたフォルダの最新.logを毎回開きます。オンにするとフォルダを選択します。',
  ],

  // ── 구간 ──────────────────────────────────────
  seg_combat: ['전투', 'Combat', '戦闘'],
  seg_idle: ['대기', 'Idle', '待機'],
  post_combat: ['전투 종료 후 정리', 'Post-combat cleanup', '戦闘終了後の整理'],
  rel_post: ['종료 +{0}:{1:00}', 'end +{0}:{1:00}', '終了 +{0}:{1:00}'],

  // ── 동작 종류(배지) ────────────────────────────
  kind_add: ['부착', 'Place', '設置'],
  kind_remove: ['제거', 'Remove', '解除'],
  kind_move: ['이동', 'Move', '移動'],
  kind_replace: ['교체', 'Replace', '変更'],
  kind_system: ['자동 해제', 'Auto', '自動解除'],

  // ── 유지 시간 단위 ─────────────────────────────
  dur_sec: ['초', 's', '秒'],
  dur_min: ['{0}분', '{0}m', '{0}分'],
  dur_minsec: ['{0}분 {1}초', '{0}m {1}s', '{0}分{1}秒'],
  dur_hourmin: ['{0}시간 {1}분', '{0}h {1}m', '{0}時間{1}分'],

  // ── 상세줄 ─────────────────────────────────────
  det_held: ['{0} 동안 유지됨', 'held {0}', '{0} 保持'],
  det_moved_from: ['이전 대상에게 {0} 동안 있었음', 'was on previous target for {0}', '前の対象に{0}あった'],
  det_replaced: ['이전 표식({0})은 {1} 동안 유지됨', 'previous marker ({0}) held {1}', '前の印（{0}）は{1}保持'],
  det_placer: ['부착자: {0}', 'placed by {0}', '設置者: {0}'],
  det_auto: ['(로그아웃·대상 소멸 등 자동 해제)', '(auto-cleared: logout, despawn, etc.)', '(ログアウト・対象消滅などで自動解除)'],

  // ── 대상 / 익명 ────────────────────────────────
  unknown_target: ['알 수 없는 대상({0})', 'Unknown target ({0})', '不明な対象（{0}）'],
  player_n: ['플레이어 {0}', 'Player {0}', 'プレイヤー{0}'],
  self: ['자신', 'self', '自分'],
  system_actor: ['시스템', 'System', 'システム'],

  // ── 마커 이름 ──────────────────────────────────
  'mk.attack1': ['공격1', 'Attack 1', '攻撃1'],
  'mk.attack2': ['공격2', 'Attack 2', '攻撃2'],
  'mk.attack3': ['공격3', 'Attack 3', '攻撃3'],
  'mk.attack4': ['공격4', 'Attack 4', '攻撃4'],
  'mk.attack5': ['공격5', 'Attack 5', '攻撃5'],
  'mk.attack6': ['공격6', 'Attack 6', '攻撃6'],
  'mk.attack7': ['공격7', 'Attack 7', '攻撃7'],
  'mk.attack8': ['공격8', 'Attack 8', '攻撃8'],
  'mk.bind1': ['속박1', 'Bind 1', '足止め1'],
  'mk.bind2': ['속박2', 'Bind 2', '足止め2'],
  'mk.bind3': ['속박3', 'Bind 3', '足止め3'],
  'mk.ignore1': ['금지1', 'Ignore 1', '禁止1'],
  'mk.ignore2': ['금지2', 'Ignore 2', '禁止2'],
  'mk.square': ['네모', 'Square', 'シカク'],
  'mk.circle': ['동그라미', 'Circle', 'マル'],
  'mk.cross': ['십자', 'Cross', 'プラス'],
  'mk.triangle': ['세모', 'Triangle', 'サンカク'],

  // ── 직업 이름 ──────────────────────────────────
  'job.1': ['검술사', 'Gladiator', '剣術士'],
  'job.2': ['격투사', 'Pugilist', '格闘士'],
  'job.3': ['도끼술사', 'Marauder', '斧術士'],
  'job.4': ['창술사', 'Lancer', '槍術士'],
  'job.5': ['궁술사', 'Archer', '弓術士'],
  'job.6': ['환술사', 'Conjurer', '幻術士'],
  'job.7': ['주술사', 'Thaumaturge', '呪術士'],
  'job.8': ['목수', 'Carpenter', '木工師'],
  'job.9': ['대장장이', 'Blacksmith', '鍛冶師'],
  'job.10': ['갑주제작사', 'Armorer', '甲冑師'],
  'job.11': ['보석공예가', 'Goldsmith', '彫金師'],
  'job.12': ['가죽공예가', 'Leatherworker', '革細工師'],
  'job.13': ['재봉사', 'Weaver', '裁縫師'],
  'job.14': ['연금술사', 'Alchemist', '錬金術師'],
  'job.15': ['요리사', 'Culinarian', '調理師'],
  'job.16': ['광부', 'Miner', '採掘師'],
  'job.17': ['원예가', 'Botanist', '園芸師'],
  'job.18': ['어부', 'Fisher', '漁師'],
  'job.19': ['나이트', 'Paladin', 'ナイト'],
  'job.20': ['몽크', 'Monk', 'モンク'],
  'job.21': ['전사', 'Warrior', '戦士'],
  'job.22': ['용기사', 'Dragoon', '竜騎士'],
  'job.23': ['음유시인', 'Bard', '吟遊詩人'],
  'job.24': ['백마도사', 'White Mage', '白魔道士'],
  'job.25': ['흑마도사', 'Black Mage', '黒魔道士'],
  'job.26': ['비술사', 'Arcanist', '巴術士'],
  'job.27': ['소환사', 'Summoner', '召喚士'],
  'job.28': ['학자', 'Scholar', '学者'],
  'job.29': ['쌍검사', 'Rogue', '双剣士'],
  'job.30': ['닌자', 'Ninja', '忍者'],
  'job.31': ['기공사', 'Machinist', '機工士'],
  'job.32': ['암흑기사', 'Dark Knight', '暗黒騎士'],
  'job.33': ['점성술사', 'Astrologian', '占星術師'],
  'job.34': ['사무라이', 'Samurai', '侍'],
  'job.35': ['적마도사', 'Red Mage', '赤魔道士'],
  'job.36': ['청마도사', 'Blue Mage', '青魔道士'],
  'job.37': ['건브레이커', 'Gunbreaker', 'ガンブレイカー'],
  'job.38': ['무도가', 'Dancer', '踊り子'],
  'job.39': ['리퍼', 'Reaper', 'リーパー'],
  'job.40': ['현자', 'Sage', '賢者'],
  'job.41': ['바이퍼', 'Viper', 'ヴァイパー'],
  'job.42': ['픽토맨서', 'Pictomancer', 'ピクトマンサー'],
  'job.43': ['마수조련사', 'Beastmaster', 'ビーストマスター'],
};

export function getString(key: string, lang: Lang): string {
  const v = MAP[key];
  if (!v) return key;
  return lang === Lang.En ? v[1] : lang === Lang.Ja ? v[2] : v[0];
}
