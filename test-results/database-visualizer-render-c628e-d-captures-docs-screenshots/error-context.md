# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: database-visualizer.spec.ts >> renders users/posts/comments schema graph and captures docs screenshots
- Location: tests/database-visualizer.spec.ts:62:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^connect$/i })

```

# Test source

```ts
  5   | import { expect, test } from 'playwright/test'
  6   | import { _electron as playwrightElectron, type ElectronApplication, type Page } from 'playwright'
  7   | 
  8   | const REPO_ROOT = path.resolve(__dirname, '..')
  9   | const MAIN_ENTRY = path.join(REPO_ROOT, 'out/main/index.js')
  10  | const DB_SCRIPT = path.join(REPO_ROOT, 'scripts/setup-test-db.ts')
  11  | const ELECTRON_CLI = path.join(REPO_ROOT, 'node_modules/electron/cli.js')
  12  | const ELECTRON_INSTALLER = path.join(REPO_ROOT, 'node_modules/electron/install.js')
  13  | const DOCS_SCREENSHOTS = {
  14  |   addConnectionFlow: path.join(REPO_ROOT, 'docs/screenshots/flow-add-connection.png'),
  15  |   queryEditorFlow: path.join(REPO_ROOT, 'docs/screenshots/flow-query-editor.png'),
  16  |   queryDataFlow: path.join(REPO_ROOT, 'docs/screenshots/flow-query-data.png'),
  17  |   connectionModal: path.join(REPO_ROOT, 'docs/screenshots/connection-modal.png'),
  18  |   mainWindow: path.join(REPO_ROOT, 'docs/screenshots/main-window.png'),
  19  |   queryEditor: path.join(REPO_ROOT, 'docs/screenshots/query-editor.png'),
  20  |   databaseVisualizer: path.join(REPO_ROOT, 'docs/screenshots/database-visualizer.png')
  21  | }
  22  | 
  23  | async function launchApp(homeDir: string): Promise<{ app: ElectronApplication; page: Page }> {
  24  |   const app = await playwrightElectron.launch({
  25  |     args: [MAIN_ENTRY],
  26  |     env: {
  27  |       ...process.env,
  28  |       HOME: homeDir,
  29  |       XDG_CONFIG_HOME: path.join(homeDir, '.config'),
  30  |       ELECTRON_DISABLE_SANDBOX: '1'
  31  |     }
  32  |   })
  33  | 
  34  |   const page = await app.firstWindow()
  35  |   await page.waitForLoadState('domcontentloaded')
  36  |   return { app, page }
  37  | }
  38  | 
  39  | async function runSql(page: Page, sql: string, expectsRows = true): Promise<void> {
  40  |   const editor = page.locator('.cm-content').first()
  41  |   await expect(editor).toBeVisible()
  42  |   await editor.click()
  43  |   await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  44  |   await page.keyboard.type(sql)
  45  |   await page.locator('.run-btn').click()
  46  |   if (expectsRows) {
  47  |     await expect(page.locator('.results-pane .data-table')).toBeVisible()
  48  |   } else {
  49  |     await expect(page.getByText(/query executed successfully — no rows returned/i)).toBeVisible()
  50  |   }
  51  | }
  52  | 
  53  | function ensureElectronBinaryInstalled(): void {
  54  |   const install = spawnSync(process.execPath, [ELECTRON_INSTALLER], {
  55  |     cwd: REPO_ROOT,
  56  |     encoding: 'utf8'
  57  |   })
  58  | 
  59  |   expect(install.status, install.stderr || install.stdout).toBe(0)
  60  | }
  61  | 
  62  | test('renders users/posts/comments schema graph and captures docs screenshots', async () => {
  63  |   expect(fs.existsSync(MAIN_ENTRY)).toBe(true)
  64  |   expect(fs.existsSync(ELECTRON_INSTALLER)).toBe(true)
  65  |   ensureElectronBinaryInstalled()
  66  | 
  67  |   const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kobeansql-schema-viz-'))
  68  |   const testDbPath = path.join(tmpRoot, 'schema-visualizer.sqlite')
  69  |   const testHome = path.join(tmpRoot, 'home')
  70  | 
  71  |   const seed = spawnSync(process.execPath, [ELECTRON_CLI, DB_SCRIPT, testDbPath], {
  72  |     cwd: REPO_ROOT,
  73  |     encoding: 'utf8',
  74  |     env: {
  75  |       ...process.env,
  76  |       ELECTRON_RUN_AS_NODE: '1'
  77  |     }
  78  |   })
  79  |   expect(seed.status, seed.stderr || seed.stdout).toBe(0)
  80  |   expect(fs.existsSync(testDbPath)).toBe(true)
  81  | 
  82  |   let app: ElectronApplication | undefined
  83  |   try {
  84  |     const launched = await launchApp(testHome)
  85  |     app = launched.app
  86  |     const { page } = launched
  87  | 
  88  |     await expect(page.getByText('Welcome to KobeanSQL')).toBeVisible()
  89  |     await page.locator('.welcome-card').getByRole('button', { name: /new connection/i }).click()
  90  | 
  91  |     const connectionModalTitle = page.locator('.modal-title', { hasText: 'New Connection' })
  92  |     await expect(connectionModalTitle).toBeVisible()
  93  |     const sqliteCard = page.locator('.db-type-card', { hasText: 'SQLite' })
  94  |     await sqliteCard.click()
  95  |     await expect(sqliteCard).toHaveClass(/selected/)
  96  | 
  97  |     await page.locator('input[placeholder*="My SQLite DB"]').fill('Schema Visualizer E2E')
  98  |     await page.locator('input[placeholder*="/path/to/database.db"]').fill(testDbPath)
  99  | 
  100 |     await fs.promises.mkdir(path.dirname(DOCS_SCREENSHOTS.databaseVisualizer), { recursive: true })
  101 |     const connectionModal = page.locator('.modal-panel')
  102 |     await connectionModal.screenshot({ path: DOCS_SCREENSHOTS.addConnectionFlow })
  103 |     await connectionModal.screenshot({ path: DOCS_SCREENSHOTS.connectionModal })
  104 | 
> 105 |     await page.getByRole('button', { name: /^connect$/i }).click()
      |                                                            ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  106 |     await expect(connectionModalTitle).toBeHidden()
  107 |     await expect(page.locator('.sidebar .connection-name', { hasText: 'Schema Visualizer E2E' })).toBeVisible()
  108 | 
  109 |     const mainLayout = page.locator('.main-layout')
  110 |     await expect(mainLayout).toBeVisible()
  111 |     await mainLayout.screenshot({ path: DOCS_SCREENSHOTS.mainWindow })
  112 | 
  113 |     const newTabButton = page.locator('.tab-new-btn')
  114 |     await expect(newTabButton).toBeVisible()
  115 |     await newTabButton.click()
  116 | 
  117 |     const connectionSelect = page.locator('.editor-connection-select')
  118 |     await expect(connectionSelect).toBeVisible()
  119 |     await connectionSelect.selectOption({ index: 1 })
  120 | 
  121 |     const contentPane = page.locator('.content-pane')
  122 |     await expect(contentPane).toBeVisible()
  123 |     await contentPane.screenshot({ path: DOCS_SCREENSHOTS.queryEditorFlow })
  124 | 
  125 |     await runSql(page, 'SELECT id, email, display_name FROM users ORDER BY id;')
  126 |     await contentPane.screenshot({ path: DOCS_SCREENSHOTS.queryDataFlow })
  127 |     await contentPane.screenshot({ path: DOCS_SCREENSHOTS.queryEditor })
  128 | 
  129 |     await runSql(page, "INSERT INTO users (email, display_name) VALUES ('charlie@example.com', 'Charlie');", false)
  130 |     await runSql(page, "SELECT display_name FROM users WHERE email = 'charlie@example.com';")
  131 |     await expect(page.locator('.results-pane .data-table')).toContainText('Charlie')
  132 | 
  133 |     await runSql(page, "UPDATE users SET display_name = 'Charles' WHERE email = 'charlie@example.com';", false)
  134 |     await runSql(page, "SELECT display_name FROM users WHERE email = 'charlie@example.com';")
  135 |     await expect(page.locator('.results-pane .data-table')).toContainText('Charles')
  136 | 
  137 |     await runSql(page, "DELETE FROM users WHERE email = 'charlie@example.com';", false)
  138 |     await runSql(page, 'SELECT COUNT(*) AS remaining_users FROM users;')
  139 |     await expect(page.locator('.results-pane .data-table')).toContainText('remaining_users')
  140 |     await expect(page.locator('.results-pane .data-table')).toContainText('2')
  141 | 
  142 |     await page.locator('button[data-tooltip="Schema Visualizer"]').click()
  143 | 
  144 |     const renderer = page.locator('.schema-visualizer-canvas .react-flow__renderer')
  145 |     await expect(renderer).toBeVisible()
  146 | 
  147 |     const nodeLocator = page.locator('.schema-visualizer-canvas .schema-table-node')
  148 |     await expect(nodeLocator).toHaveCount(3)
  149 |     await expect(page.locator('.schema-visualizer-canvas .schema-table-name', { hasText: 'users' })).toBeVisible()
  150 |     await expect(page.locator('.schema-visualizer-canvas .schema-table-name', { hasText: 'posts' })).toBeVisible()
  151 |     await expect(page.locator('.schema-visualizer-canvas .schema-table-name', { hasText: 'comments' })).toBeVisible()
  152 | 
  153 |     const edgePaths = page.locator('.schema-visualizer-canvas .react-flow__edge-path')
  154 |     await expect(edgePaths).toHaveCount(3)
  155 | 
  156 |     const canvasWrapper = page.locator('.schema-visualizer-canvas')
  157 |     await canvasWrapper.screenshot({ path: DOCS_SCREENSHOTS.databaseVisualizer })
  158 | 
  159 |   } finally {
  160 |     await app?.close()
  161 |     fs.rmSync(tmpRoot, { recursive: true, force: true })
  162 |   }
  163 | })
  164 | 
```