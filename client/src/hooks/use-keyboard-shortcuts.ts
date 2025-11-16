import { useEffect } from "react"

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find(
        (s) =>
          s.key.toLowerCase() === event.key.toLowerCase() &&
          (s.ctrlKey === undefined || s.ctrlKey === event.ctrlKey) &&
          (s.shiftKey === undefined || s.shiftKey === event.shiftKey) &&
          (s.altKey === undefined || s.altKey === event.altKey) &&
          (s.metaKey === undefined || s.metaKey === (event.metaKey || event.ctrlKey))
      )

      if (shortcut) {
        event.preventDefault()
        shortcut.action()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts, enabled])
}

export function getShortcutText(shortcut: KeyboardShortcut): string {
  const parts: string[] = []
  
  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(navigator.platform.includes("Mac") ? "⌘" : "Ctrl")
  }
  if (shortcut.shiftKey) parts.push("⇧")
  if (shortcut.altKey) parts.push(navigator.platform.includes("Mac") ? "⌥" : "Alt")
  
  parts.push(shortcut.key.toUpperCase())
  
  return parts.join("+")
}
