import { useState } from "react"
import { Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts"
import { getShortcutText } from "@/hooks/use-keyboard-shortcuts"

interface KeyboardShortcutsDialogProps {
  shortcuts: KeyboardShortcut[]
}

export function KeyboardShortcutsDialog({ shortcuts }: KeyboardShortcutsDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-testid="button-keyboard-shortcuts">
          <Keyboard className="w-4 h-4 mr-2" />
          Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-0"
            >
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded">
                {getShortcutText(shortcut)}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
