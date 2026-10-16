import { useEffect, useRef, useState } from 'react'
import { Button } from 'game-kit/turns'
import { RulesSheet } from './RulesSheet'

// A button that opens the full rules sheet in a modal dialog. The sheet only renders
// while open: its six map excerpts each draw a whole map.

export function RulesButton() {
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal()
  }, [isOpen])

  // Closing the dialog, by button, Escape or a click on the backdrop, fires its close event.
  const close = () => dialogRef.current?.close()

  return (
    <>
      <Button tone="secondary" onClick={() => setIsOpen(true)} aria-haspopup="dialog">
        Rules
      </Button>
      <dialog
        ref={dialogRef}
        aria-label="Rules"
        onClose={() => setIsOpen(false)}
        onClick={event => {
          if (event.target === event.currentTarget) close()
        }}
        className="m-auto max-h-[calc(100dvh-1.5rem)] w-[min(1240px,calc(100vw-1.5rem))] max-w-none overflow-y-auto rounded-2xl bg-paper p-0 text-ink backdrop:bg-ink/60"
      >
        {isOpen && (
          <>
            <div className="sticky top-0 z-10 flex justify-end bg-paper/90 px-3 py-3 backdrop-blur-sm">
              <Button onClick={close}>Close</Button>
            </div>
            <div className="px-5 pb-8 sm:px-10">
              <RulesSheet />
            </div>
          </>
        )}
      </dialog>
    </>
  )
}
