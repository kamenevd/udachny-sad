import type { ReactNode } from 'react'

interface Props {
  title?: string
  onClose: () => void
  children: ReactNode
}

/** Нижний модальный лист. */
export default function Sheet({ title, onClose, children }: Props) {
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        {title && (
          <div className="sheet-title">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </>
  )
}
