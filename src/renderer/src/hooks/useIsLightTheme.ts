import { useAppStore } from '../store'

export function useIsLightTheme(): boolean {
  const theme = useAppStore((s) => s.theme)
  if (theme === 'light') return true
  if (theme === 'system') return !window.matchMedia('(prefers-color-scheme: dark)').matches
  return false
}
