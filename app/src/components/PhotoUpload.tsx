/**
 * PhotoUpload — загрузка фото (задача 6.1; PocketBase — задача C.6).
 *
 * `<input capture>` с камеры, компрессия через canvas (≤1600px, JPEG),
 * загрузка одним запросом `photos.create(FormData)` — PocketBase хранит
 * файл нативно (ownerType/ownerId полиморфная связь, см. pb_migrations/001_init.js),
 * в отличие от трёхшагового Convex-паттерна generateUploadUrl → POST → save.
 *
 * DESIGN.md v5.1 §6 — стиль бумажного журнала: двойная рамка, shadow-blank.
 *
 * Использование:
 *   <PhotoUpload ownerType="planting" ownerId={plantingId} onUploaded={() => refetch()} />
 */

import { useRef, useState } from 'react';
import { photos as photosApi, type PhotoOwnerType } from '../lib/pb';
import { useSafePbAction } from '../hooks/useSafePbAction';
import { useStorageEstimate } from '../hooks/useStorageEstimate';
import { StampOverlay } from './StampOverlay';
import { Modal } from './Modal';
import { Input } from './Input';

interface PhotoUploadProps {
  ownerType: PhotoOwnerType;
  ownerId: string;
  /** Коллбэк после успешной загрузки — чтобы родитель мог обновить данные */
  onUploaded?: () => void;
  /** Текст кнопки (по умолчанию — адаптивный: «Сделать фото» или «Загрузить фото») */
  buttonText?: string;
}

/** Максимальная сторона изображения после компрессии */
const MAX_DIMENSION = 1600;
/** Качество JPEG после компрессии */
const JPEG_QUALITY = 0.82;

/**
 * Сжимает изображение через canvas до MAX_DIMENSION по длинной стороне.
 * Возвращает Blob в формате JPEG.
 */
async function compressImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width: sw, height: sh } = bitmap;

  let dw = sw;
  let dh = sh;
  if (sw > MAX_DIMENSION || sh > MAX_DIMENSION) {
    if (sw >= sh) {
      dw = MAX_DIMENSION;
      dh = Math.round((sh / sw) * MAX_DIMENSION);
    } else {
      dh = MAX_DIMENSION;
      dw = Math.round((sw / sh) * MAX_DIMENSION);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas не поддерживается');
  ctx.drawImage(bitmap, 0, 0, dw, dh);

  bitmap.close?.();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Не удалось сжать фото'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

  return { blob, width: dw, height: dh };
}

export function PhotoUpload({
  ownerType,
  ownerId,
  onUploaded,
  buttonText,
}: PhotoUploadProps) {
  // Feature-detection камеры (задача 18.4)
  const hasCamera = typeof navigator !== 'undefined' && (
    'mediaDevices' in navigator || 'capture' in HTMLInputElement.prototype
  );
  // Текст кнопки: явный или адаптивный (задача 18.4)
  const effectiveButtonText = buttonText ?? (hasCamera ? '📸 Сделать фото' : '📎 Загрузить фото');
  const createPhoto = useSafePbAction((data: FormData) => photosApi.create(data));
  // Задача F.3 — предупреждение о нехватке места перед загрузкой фото.
  const storage = useStorageEstimate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<string>('');
  const [stamp, setStamp] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<{ blob: Blob; width: number; height: number } | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setError('');
    setBusy(true);
    setProgress('Обработка…');
    try {
      // Шаг 0: компрессия через canvas
      const compressed = await compressImage(file);
      setPendingBlob(compressed);
      setCaption('');
      // Открываем модал для подписи (задача 11.3)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось обработать фото');
    } finally {
      setBusy(false);
      setProgress('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingBlob) return;
    setUploading(true);
    setError('');
    setProgress('Загрузка…');
    try {
      const { blob, width, height } = pendingBlob;

      const formData = new FormData();
      formData.append('ownerType', ownerType);
      formData.append('ownerId', ownerId);
      formData.append('file', blob, 'photo.jpg');
      if (caption.trim()) formData.append('caption', caption.trim());
      formData.append('width', String(width));
      formData.append('height', String(height));
      formData.append('fileSize', String(blob.size));

      await createPhoto.mutate(formData);

      setStamp('ЗАПИСАНО');
      setPendingBlob(null);
      setCaption('');
      onUploaded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
      setBusy(false);
      setProgress('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleFile(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        {...(hasCamera ? { capture: "environment" } : {})}
        onChange={handleChange}
        disabled={busy}
        className="hidden"
        aria-label="Выбрать фото"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="h-[56px] w-full rounded-lg border-2 border-ink bg-paper px-6 font-poster text-[15px] font-semibold uppercase tracking-[0.04em] text-ink shadow-blank outline-1 outline-ink outline-offset-[-6px] transition-all duration-75 active:translate-y-[2px] active:shadow-[1px_1px_0_rgba(32,42,56,.25)] focus-visible:outline-3 focus-visible:outline-red focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? progress || 'Загрузка…' : effectiveButtonText}
      </button>
      {storage.lowSpace && (
        <p
          role="alert"
          className="rounded-lg border border-red bg-red/5 px-3 py-2 text-[14px] text-red"
        >
          ⚠️ Мало места на телефоне — фото может не сохраниться. Освободите память.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red bg-red/5 px-3 py-2 text-[14px] text-red">
          {error}
        </p>
      )}
      {/* Модал подписи к фото (задача 11.3) */}
      <Modal
        open={pendingBlob !== null}
        title="Подпись к фото?"
        confirmText={uploading ? 'Загрузка…' : 'Загрузить'}
        cancelText="Без подписи"
        onConfirm={() => void handleConfirmUpload()}
        onCancel={() => {
          if (!uploading) {
            // Загрузить без подписи
            void handleConfirmUpload();
          }
        }}
      >
        <Input
          label="Что на фото? (необязательно)"
          placeholder="Например: огурцы зацвели"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={uploading}
        />
        {progress && (
          <p className="mt-2 font-mono text-[14px] text-ink-muted">{progress}</p>
        )}
      </Modal>

      <StampOverlay action={stamp} onClose={() => setStamp(null)} />
    </div>
  );
}
