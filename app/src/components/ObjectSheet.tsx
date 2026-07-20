/**
 * ObjectSheet — свойства выбранного объекта схемы (задача 3.5).
 * Переименование (label) и «Списать со схемы» с подтверждением;
 * запрет удаления при существующих посадках (инвариант §3.4 ARCHITECTURE).
 */

import { useEffect, useRef, useState } from 'react';
import { schemaObjects as schemaObjectsApi } from '../lib/pb';
import { plantings as plantingsApi } from '../lib/pb';
import { deletePhotosFor } from '../lib/pbBackup';
import { useSafePbAction } from '../hooks/useSafePbAction';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { objectTypeInfo } from './canvas/EditorToolbar';
import { PlantingForm } from './PlantingForm';
import { StampOverlay } from './StampOverlay';
import { PhotoUpload } from './PhotoUpload';
import { PhotoGallery } from './PhotoGallery';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { CompositionContextTooltip } from './canvas/CompositionContextTooltip';
import type { LightCondition } from '../lib/compositionContext';
import { BedTemplatePicker } from './PlantWizard/BedTemplatePicker';
import { templatesForObjectType } from '../data/bedTemplates';

export interface ObjectSheetTarget {
  id: string;
  type: string;
  label?: string;
}

interface ObjectSheetProps {
  object: ObjectSheetTarget | null;
  gardenId: string;
  onClose: () => void;
  /** Открыть историю места (задача 5.5) */
  onOpenPlaceHistory?: (schemaObjectId: string) => void;
  /** Освещённость пересекающих объект зон — для контекстного тултипа (H.2). */
  lightConditions?: LightCondition[];
}

/** Типы объектов, для которых показываем контекст истории места (H.2). */
const CONTEXT_TYPES = new Set(['flowerbed', 'composition', 'hedge']);

export function ObjectSheet({ object, gardenId, onClose, onOpenPlaceHistory, lightConditions }: ObjectSheetProps) {
  const updateObject = useSafePbAction(
    (id: string, label: string | undefined) => schemaObjectsApi.update(id, { label }),
  );
  const removeObject = useSafePbAction(async (id: string) => {
    // Инвариант §3.4 ARCHITECTURE (convex/schemaObjects.ts remove): если у
    // объекта есть посадки — списать нельзя, история мест должна сохраниться.
    const existing = await plantingsApi.list({ filter: `schemaObjectId="${id}"` });
    if (existing.length > 0) {
      throw new Error('На этом месте есть записи о посадках — списать его со схемы нельзя. История должна сохраниться.');
    }
    await deletePhotosFor('schemaObject', id);
    await schemaObjectsApi.remove(id);
  });

  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showPlanting, setShowPlanting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [stampAction, setStampAction] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const skipDirtyRef = useRef(false);

  // При смене объекта — сбросить форму
  useEffect(() => {
    skipDirtyRef.current = true;
    setLabel(object?.label ?? '');
    setError('');
    setConfirmRemove(false);
    setDirty(false);
  }, [object?.id, object?.label]);

  // Отмечаем форму «грязной» при правке названия
  useEffect(() => {
    if (!object) return;
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false;
      return;
    }
    setDirty(true);
  }, [object, label]);

  useUnsavedChanges(!!object && dirty && !busy);

  if (!object) return null;

  const info = objectTypeInfo(object.type);
  const objectId = object.id;

  const handleRename = async () => {
    setError('');
    setBusy(true);
    try {
      await updateObject.mutate(objectId, label.trim() || undefined);
      setDirty(false);
    } catch {
      setError('Не получилось сохранить название. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setError('');
    setBusy(true);
    try {
      await removeObject.mutate(objectId);
      setConfirmRemove(false);
      onClose();
    } catch (e) {
      setConfirmRemove(false);
      const message = e instanceof Error ? e.message : '';
      setError(
        message.includes('посадк')
          ? 'На этом месте есть записи о посадках — списать нельзя. История должна сохраниться.'
          : 'Не получилось списать объект. Попробуйте ещё раз.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 border-t-2 border-ink bg-paper p-4 shadow-blank">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[24px]">{info.icon}</span>
            <span className="font-poster text-[17px] font-semibold uppercase text-ink">
              {info.label}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-lg p-2 text-ink transition-colors hover:bg-ink/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Название"
              placeholder={info.label}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            onClick={() => void handleRename()}
            disabled={busy}
            className="shrink-0"
          >
            Сохранить
          </Button>
        </div>

        {error && <p className="font-mono text-[14px] text-red">{error}</p>}

        {/* Контекст из истории места (задача H.2) — для клумб/композиций/изгородей */}
        {CONTEXT_TYPES.has(object.type) && (
          <CompositionContextTooltip
            schemaObjectId={object.id}
            conditions={lightConditions}
          />
        )}

        <Button
          variant="primary"
          onClick={() => setShowPlanting(true)}
          disabled={busy}
          className="w-full"
        >
          🌱 Посадить здесь
        </Button>

        {/* Шаблон клумбы (PLAN12 задача 9) — только там, где он осмыслен */}
        {templatesForObjectType(object.type).length > 0 && (
          <Button
            variant="secondary"
            onClick={() => setShowTemplates(true)}
            disabled={busy}
            className="w-full"
          >
            🌿 Применить шаблон
          </Button>
        )}

        {onOpenPlaceHistory && (
          <Button
            variant="secondary"
            onClick={() => onOpenPlaceHistory(object.id)}
            disabled={busy}
            className="w-full"
          >
            📜 Что росло здесь
          </Button>
        )}

        {/* Фотографии места (задача 11.2) */}
        <PhotoGallery ownerType="schemaObject" ownerId={object.id} title="Фото места" />
        <PhotoUpload
          ownerType="schemaObject"
          ownerId={object.id}
          buttonText="📸 Фото места"
        />

        <Button
          variant="danger"
          onClick={() => setConfirmRemove(true)}
          disabled={busy}
          className="w-full"
        >
          Списать со схемы
        </Button>
      </div>

      {/* Форма посадки (задача 4.2) */}
      <PlantingForm
        open={showPlanting}
        gardenId={gardenId}
        schemaObjectId={objectId}
        onClose={() => setShowPlanting(false)}
        onCreated={() => setStampAction('ПОСАЖЕНО')}
      />

      {/* Шаблоны клумб (PLAN12 задача 9) */}
      <BedTemplatePicker
        open={showTemplates}
        gardenId={gardenId}
        schemaObjectId={objectId}
        objectType={object.type}
        onClose={() => setShowTemplates(false)}
        onApplied={() => setStampAction('ПОСАЖЕНО')}
      />

      {/* Печать-подтверждение после создания посадки (задача 5.3) */}
      <StampOverlay action={stampAction} onClose={() => setStampAction(null)} />

      <Modal
        open={confirmRemove}
        title="Списать объект со схемы?"
        confirmVariant="danger"
        confirmText={busy ? 'Списываем…' : 'Списать'}
        cancelText="Отмена"
        onConfirm={() => void handleRemove()}
        onCancel={() => setConfirmRemove(false)}
      >
        Объект исчезнет с генплана. Если на нём есть посадки — списать не
        получится: история мест должна сохраниться.
      </Modal>
    </div>
  );
}
