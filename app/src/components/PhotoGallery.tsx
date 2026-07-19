/**
 * PhotoGallery — галерея фото (задача 6.2; PocketBase — задача C.6).
 *
 * Миниатюры у посадки/события/объекта, полноэкранный просмотр по тапу,
 * удаление с подтверждением через Modal. Список — реактивный через
 * usePbCollection (realtime-подписка PocketBase, задача C.3), URL файла —
 * pb.files.getURL() (photoUrl helper в lib/pb.ts) вместо ctx.storage.getUrl().
 *
 * DESIGN.md v5.1 §6 — двойная рамка, shadow-blank, бумажный журнал.
 *
 * Использование:
 *   <PhotoGallery ownerType="planting" ownerId={plantingId} />
 */

import { useState, useEffect } from 'react';
import { photos as photosApi, photoUrl, type Photo, type PhotoOwnerType } from '../lib/pb';
import { usePbCollection } from '../hooks/usePbCollection';
import { useSafePbAction } from '../hooks/useSafePbAction';
import { Modal } from './Modal';

interface PhotoGalleryProps {
  ownerType: PhotoOwnerType;
  ownerId: string;
  /** Заголовок секции (по умолчанию «Фотографии») */
  title?: string;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function PhotoGallery({ ownerType, ownerId, title = 'Фотографии' }: PhotoGalleryProps) {
  const { data: photos, refetch } = usePbCollection<Photo>(
    photosApi,
    `ownerType="${ownerType}" && ownerId="${ownerId}"`,
  );
  const removePhoto = useSafePbAction((photoId: string) => photosApi.remove(photoId));

  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Закрытие полноэкранного просмотрщика по Escape (задача 9.2)
  useEffect(() => {
    if (!viewerPhoto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewerPhoto(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [viewerPhoto]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await removePhoto.mutate(confirmDeleteId);
      setConfirmDeleteId(null);
      if (viewerPhoto?.id === confirmDeleteId) setViewerPhoto(null);
      await refetch();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Не удалось удалить фото');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (photos === undefined) {
    return (
      <p className="py-3 text-center font-mono text-[14px] text-ink-muted">
        Загрузка…
      </p>
    );
  }

  if (photos.length === 0) {
    return null; // Нет фото — не показываем секцию
  }

  return (
    <section>
      <h2 className="mb-3 font-poster text-[14px] font-semibold uppercase tracking-[0.04em] text-ink">
        {title} ({photos.length})
      </h2>

      {/* Сетка миниатюр */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setViewerPhoto(photo)}
            className="group relative aspect-square overflow-hidden rounded-[8px] border-2 border-ink shadow-blank outline-1 outline-ink outline-offset-[-4px] transition-all duration-75 active:translate-y-[1px]"
            aria-label={`Фото от ${formatDate(photo.created)} — открыть`}
          >
            <img
              src={photoUrl(photo)}
              alt={photo.caption || `Фото от ${formatDate(photo.created)}`}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>

      {/* Полноэкранный просмотр */}
      {viewerPhoto && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фото"
          onClick={() => setViewerPhoto(null)}
        >
          {/* Верхняя панель: дата + закрыть + удалить */}
          <div
            className="flex items-center justify-between px-4 pt-4 pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-mono text-[14px] text-white/70">
              {formatDate(viewerPhoto.created)}
              {viewerPhoto.fileSize ? ` · ${formatSize(viewerPhoto.fileSize)}` : ''}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(viewerPhoto.id)}
                aria-label="Удалить фото"
                className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-red"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewerPhoto(null)}
                aria-label="Закрыть"
                className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Фото */}
          <div className="flex flex-1 items-center justify-center overflow-hidden px-4 pb-4">
            <img
              src={photoUrl(viewerPhoto)}
              alt={viewerPhoto.caption || 'Фото'}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Подпись если есть */}
          {viewerPhoto.caption && (
            <div
              className="px-4 pb-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-[16px] leading-relaxed text-white/80">
                {viewerPhoto.caption}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Модал подтверждения удаления */}
      <Modal
        open={confirmDeleteId !== null}
        title="Удалить фото?"
        confirmText="Удалить"
        confirmVariant="danger"
        onCancel={() => {
          setConfirmDeleteId(null);
          setDeleteError('');
        }}
        onConfirm={handleDelete}
      >
        Фотографию нельзя будет восстановить. Удалить навсегда?
        {deleteBusy && (
          <p className="mt-2 font-mono text-[14px] text-ink-muted">
            Удаление…
          </p>
        )}
        {deleteError && (
          <p className="mt-2 rounded-lg border border-red bg-red/5 px-3 py-2 text-[14px] text-red">
            {deleteError}
          </p>
        )}
      </Modal>
    </section>
  );
}
