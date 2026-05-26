import { useCallback, useSyncExternalStore } from 'react'
import { t as translateFn, getLocale, setLocale } from '../i18n'
import type { TranslationKey } from '../i18n/locales/en'

// Simple external store so React components re-render on locale change.
const listeners = new Set<() => void>()

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot(): string {
  return getLocale()
}

/** Patch setLocale to notify React subscribers. */
const originalSetLocale = setLocale
;(globalThis as { __kobeanSqlLocalePatched?: boolean }).__kobeanSqlLocalePatched =
  (globalThis as { __kobeanSqlLocalePatched?: boolean }).__kobeanSqlLocalePatched ?? false

if (!(globalThis as { __kobeanSqlLocalePatched?: boolean }).__kobeanSqlLocalePatched) {
  ;(globalThis as { __kobeanSqlLocalePatched?: boolean }).__kobeanSqlLocalePatched = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).__notifyLocaleChange = () => listeners.forEach((cb) => cb())
}

export { originalSetLocale as setLocale }

/**
 * React hook providing a `t()` translation function that automatically
 * re-renders the component when the active locale changes.
 *
 * @example
 *   const { t } = useTranslation()
 *   return <span>{t('sidebar.connections')}</span>
 */
export function useTranslation(): {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  locale: string
} {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => translateFn(key, params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  )

  return { t, locale }
}
