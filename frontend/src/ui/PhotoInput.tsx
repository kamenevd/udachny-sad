import { useEffect, useRef, useState } from 'react'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
  max?: number
}

/** Выбор фотографий с предпросмотром (камера или галерея). */
export default function PhotoInput({ files, onChange, max = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<string[]>([])

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f))
    setUrls(next)
    return () => next.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  function pick(list: FileList | null) {
    if (!list) return
    const merged = [...files, ...Array.from(list)].slice(0, max)
    onChange(merged)
  }

  return (
    <div className="photo-input">
      {files.map((f, i) => (
        <div className="photo-preview" key={`${f.name}-${i}`}>
          <img src={urls[i]} alt="" />
          <button
            type="button"
            aria-label="Убрать фото"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      {files.length < max && (
        <button
          type="button"
          className="photo-add"
          aria-label="Добавить фото"
          onClick={() => inputRef.current?.click()}
        >
          📷
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        hidden
        onChange={(e) => {
          pick(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
