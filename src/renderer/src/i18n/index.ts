/**
 * KobeanSQL lightweight i18n module.
 *
 * Usage:
 *   import { t, setLocale } from '@renderer/i18n'
 *
 *   t('sidebar.connections')          // → 'Connections'
 *   t('status.rowCount', { count: 5, plural: 's', ms: 42 })
 *                                     // → '5 rows in 42ms'
 *
 * To add a new language:
 *   1. Create `src/renderer/src/i18n/locales/<lang>.ts` mirroring `en.ts`.
 *   2. Import it in this file, add it to the `registry` object, and export it.
 *   3. Call `setLocale('<lang>')` from your settings UI.
 *   For dynamic / plugin locales use `registerLocale('<lang>', messages)` instead.
 */

import en, { TranslationKey } from './locales/en'
import de from './locales/de'
import es from './locales/es'
import fr from './locales/fr'
import ja from './locales/ja'
import vi from './locales/vi'

const LOCALE_STORAGE_KEY = 'kobeansql-locale'

type Messages = Record<string, string>
type Params = Record<string, string | number>

const registry: Record<string, Messages> = {
  de: de as unknown as Messages,
  en: en as unknown as Messages,
  es: es as unknown as Messages,
  fr: fr as unknown as Messages,
  ja: ja as unknown as Messages,
  vi: vi as unknown as Messages,
}

let currentLocale = 'en'

/** Register an additional locale. Must mirror all keys from en.ts. */
export function registerLocale(locale: string, messages: Messages): void {
  registry[locale] = messages
}

/**
 * Returns the current locale code (e.g. 'en').
 */
export function getLocale(): string {
  return currentLocale
}

/**
 * Change the active locale. Persists the choice to localStorage.
 */
export function setLocale(locale: string): void {
  if (!registry[locale]) {
    console.warn(`[i18n] Locale "${locale}" is not registered, falling back to "en"`)
    locale = 'en'
  }
  const changed = currentLocale !== locale
  currentLocale = locale
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {/* ignore */}
  if (changed) {
    ;(globalThis as { __notifyLocaleChange?: () => void }).__notifyLocaleChange?.()
  }
}

/**
 * Translate a key, optionally interpolating `{param}` placeholders.
 *
 * Falls back to the English value, then to the raw key if neither is found.
 */
export function t(key: TranslationKey, params?: Params): string {
  const messages = registry[currentLocale] ?? registry['en']
  const fallback = registry['en']
  let template = messages[key] ?? fallback[key] ?? (key as string)

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      template = template.replaceAll(`{${name}}`, String(value))
    }
  }

  return template
}

/**
 * Returns a list of all registered locale codes (e.g. ['de', 'en', 'es', 'fr', 'ja', 'vi']).
 */
export function getSupportedLocales(): string[] {
  return Object.keys(registry)
}

// Restore persisted locale on module load (runs once in the renderer process)
try {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored && registry[stored]) {
    currentLocale = stored
  }
} catch {/* ignore – SSR / test environments */}
