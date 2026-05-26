/**
 * Japanese locale strings for KobeanSQL.
 */
const ja = {
  // ── App-level ─────────────────────────────────────────────────
  'app.name': 'KobeanSQL',
  'app.version': 'バージョン',

  // ── Sidebar ───────────────────────────────────────────────────
  'sidebar.connections': '接続',
  'sidebar.noConnections': '接続なし',
  'sidebar.noConnectionsSub': '+ をクリックしてデータベース接続を追加',
  'sidebar.addConnection': '接続を追加',
  'sidebar.newConnection': '新しい接続',
  'sidebar.importConnections': '接続をインポート',
  'sidebar.exportConnections': '接続をエクスポート',
  'sidebar.templates': 'SQLテンプレート',
  'sidebar.savedQueries': '保存済みクエリ',
  'sidebar.noSavedQueries': '保存済みクエリはありません',
  'sidebar.noSavedQueriesSub': 'Ctrl/Cmd+S でエディタからクエリを保存',

  // ── Connection Modal ───────────────────────────────────────────
  'connection.newTitle': '新しい接続',
  'connection.editTitle': '接続を編集',
  'connection.dbType': 'データベースの種類',
  'connection.name': '接続名',
  'connection.category': 'カテゴリ（任意）',
  'connection.categoryPlaceholder': '例: 本番、ステージング、ローカル…',
  'connection.method': '接続方法',
  'connection.manual': '手動',
  'connection.uri': '接続URI',
  'connection.host': 'ホスト',
  'connection.port': 'ポート',
  'connection.user': 'ユーザー',
  'connection.password': 'パスワード',
  'connection.database': 'データベース',
  'connection.file': 'データベースファイル',
  'connection.ssl': 'SSLを使用',
  'connection.color': '色',
  'connection.test': '接続をテスト',
  'connection.testing': 'テスト中…',
  'connection.connect': '接続して保存',
  'connection.connecting': '接続中…',
  'connection.success': '接続に成功しました',
  'connection.nameRequired': '接続名は必須です',
  'connection.uriRequired': '接続URIは必須です',

  // ── Query Editor ──────────────────────────────────────────────
  'editor.run': '実行',
  'editor.stop': '停止',
  'editor.save': 'クエリを保存',
  'editor.beautify': 'SQLを整形',
  'editor.buildSql': 'SQLを構築',
  'editor.aiGenerate': 'AI: SQLを生成',
  'editor.aiExplain': 'AI: SQLを説明',
  'editor.aiOptimize': 'AI: SQLを最適化',
  'editor.placeholder': 'ここにSQLを記述…',
  'editor.noConnection': '接続を選択',
  'editor.queryName': 'クエリ名',
  'editor.queryCategory': 'カテゴリ（任意）',
  'editor.saveTitle': 'クエリを保存',
  'editor.cancel': 'キャンセル',
  'editor.insert': '挿入',

  // ── Settings Modal ─────────────────────────────────────────────
  'settings.title': '設定',
  'settings.queryLimit': 'デフォルトのクエリ行制限',
  'settings.queryLimitHelp': 'テーブル閲覧時に返される行数。デフォルト: 100。最大: 10,000。',
  'settings.updateChecks': 'アップデート確認を有効にする',
  'settings.updateChecksHelp': 'GitHubリリースで新しいバージョンを確認します。いつでも無効にできます。',
  'settings.updateInterval': 'アップデート確認間隔（時間）',
  'settings.aiProvider': 'AIプロバイダー',
  'settings.aiBaseUrl': 'AIベースURL',
  'settings.aiModel': 'AIモデル',
  'settings.aiModelFetch': 'モデルを取得',
  'settings.aiModelFetching': '取得中…',
  'settings.aiModelPlaceholder': '例: llama3.1',
  'settings.save': '保存',
  'settings.saving': '保存中…',
  'settings.cancel': 'キャンセル',

  // ── Buttons / common ──────────────────────────────────────────
  'common.close': '閉じる',
  'common.delete': '削除',
  'common.rename': '名前を変更',
  'common.edit': '編集',
  'common.copy': 'コピー',
  'common.open': '開く',
  'common.search': '検索…',
  'common.confirm': '確認',
  'common.yes': 'はい',
  'common.no': 'いいえ',

  // ── Theme ─────────────────────────────────────────────────────
  'theme.dark': 'ダーク',
  'theme.light': 'ライト',
  'theme.system': 'システム',

  // ── Status / feedback ─────────────────────────────────────────
  'status.rowCount': '{ms}ms で {count} 行{plural}',
  'status.querySaved': 'クエリを保存しました: {name}',
  'status.templateInserted': 'SQLテンプレートを挿入しました',
  'status.logsOpened': 'ログフォルダを開きました',
  'status.upToDate': '最新の状態です',
  'status.updateAvailable': 'アップデートが利用可能: v{version}',

  // ── Privacy / About ───────────────────────────────────────────
  'about.title': 'KobeanSQL について',
  'privacy.title': 'プライバシーとセキュリティ',
} as const

export default ja
