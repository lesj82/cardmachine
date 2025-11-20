'use client'
import React from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  React.useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', onEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = 'auto'
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <button
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/95 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            {title && (
              <h2 className="text-sm md:text-base font-semibold text-slate-50">
                {title}
              </h2>
            )}
            <p className="text-[11px] text-slate-400">
              This is an indicative savings view based on your uploaded statement.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5 pt-4">{children}</div>
      </div>
    </div>
  )
}
