/**
 * StatusActions — действия статуса посадки (задача 5.4).
 *
 * Три действия:
 *  - «Пересадить» → выбор нового объекта схемы → plantings.transplant
 *  - «Погибло» → подтверждение → plantings.close(dead)
 *  - «Завершить» → подтверждение → plantings.close(completed)
 *
 * DESIGN.md v5.1 §6 — печать «СПИСАНО» после закрытия,
 * подтверждение через Modal.
 */

import { useEffect, useState } from 'react';
import { schemaObjects as schemaObjectsApi, type SchemaObject } from '../lib/pb';
import { closePlanting, transplantPlanting } from '../lib/pbPlantings';
import { useSafePbAction } from "../hooks/useSafePbAction";
import { Button } from './Button';
import { Modal } from './Modal';
import { Input } from './Input';
import { StampOverlay } from './StampOverlay';
import { objectTypeInfo } from './canvas/EditorToolbar';

interface StatusActionsProps {
  plantingId: string;
  gardenId: string;
  /** Вызывается после успешного закрытия/пересадки (уход с экрана) */
  onClosed?: () => void;
  /** Показывать ли блок — только для активных посадок */
  status: string;
}

type ConfirmKind = 'transplant' | 'dead' | 'completed' | null;

export function StatusActions({ plantingId, gardenId, onClosed, status }: StatusActionsProps) {
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stamp, setStamp] = useState<string | null>(null);

  // Для пересадки — выбор нового объекта
  const [objects, setObjects] = useState<SchemaObject[]>([]);
  useEffect(() => {
    void schemaObjectsApi.list({ filter: `gardenId="${gardenId}"` }).then(setObjects);
  }, [gardenId]);
  const [targetObjectId, setTargetObjectId] = useState<string>('');
  const [positionNote, setPositionNote] = useState('');

  const doClosePlanting = useSafePbAction(closePlanting);
  const transplant = useSafePbAction(transplantPlanting);

  // Только для активных посадок
  if (status !== 'active') return null;

  const handleConfirm = async () => {
    setError('');
    setBusy(true);
    try {
      const now = new Date().toISOString();
      if (confirm === 'transplant') {
        await transplant.mutate({
          plantingId,
          newSchemaObjectId: targetObjectId || undefined,
          newPositionNote: positionNote.trim() || undefined,
          transplantDate: now,
        });
        setStamp('ПЕРЕСАЖЕНО');
      } else if (confirm === 'dead') {
        await doClosePlanting.mutate({ plantingId, status: 'dead', endedAt: now });
        setStamp('СПИСАНО');
      } else if (confirm === 'completed') {
        await doClosePlanting.mutate({ plantingId, status: 'completed', endedAt: now });
        setStamp('ЗАВЕРШЕНО');
      }
      setConfirm(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(
        msg || 'Не получилось сохранить. Проверьте связь и попробуйте ещё раз.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={() => setConfirm('transplant')}>
          🔄 Пересадить
        </Button>
        <Button variant="danger" onClick={() => setConfirm('dead')}>
          💀 Погибло
        </Button>
        <Button variant="secondary" onClick={() => setConfirm('completed')}>
          ✓ Завершить
        </Button>
      </div>

      {/* Подтверждение */}
      <Modal
        open={confirm !== null}
        title={
          confirm === 'transplant'
            ? 'Пересадить на новое место?'
            : confirm === 'dead'
              ? 'Отметить как погибшее?'
              : 'Завершить посадку?'
        }
        confirmVariant={confirm === 'dead' ? 'danger' : 'primary'}
        confirmText={busy ? 'Сохраняем…' : 'Подтвердить'}
        cancelText="Отмена"
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          setConfirm(null);
          setError('');
        }}
      >
        {confirm === 'transplant' && (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] leading-[1.5] text-ink">
              Старая запись закроется со статусом «пересажено», появится новая —
              на выбранном месте.
            </p>
            <div>
              <label className="mb-1 block font-poster text-[13px] uppercase tracking-[0.05em] text-ink-muted">
                Новое место на схеме
              </label>
              <select
                value={targetObjectId}
                onChange={(e) => setTargetObjectId(e.target.value)}
                className="w-full rounded-[6px] border-2 border-ink bg-paper px-3 py-2 font-mono text-[16px] text-ink focus:outline-none focus:ring-2 focus:ring-red"
              >
                <option value="">— без привязки к схеме —</option>
                {objects.map((obj) => {
                  const info = objectTypeInfo(obj.type);
                  return (
                    <option key={obj.id} value={obj.id}>
                      {info.icon} {obj.label ?? info.label}
                    </option>
                  );
                })}
              </select>
            </div>
            <Input
              label="Уточнение места (необязательно)"
              placeholder="у забора, слева от теплицы"
              value={positionNote}
              onChange={(e) => setPositionNote(e.target.value)}
            />
          </div>
        )}
        {confirm === 'dead' && (
          <p className="text-[15px] leading-[1.5] text-ink">
            Посадка закроется со статусом «погибло». В журнал добавится запись.
            Это действие необратимо.
          </p>
        )}
        {confirm === 'completed' && (
          <p className="text-[15px] leading-[1.5] text-ink">
            Посадка завершится — запись останется в истории места. Это действие
            необратимо.
          </p>
        )}
        {error && (
          <p className="mt-3 font-mono text-[14px] text-red">{error}</p>
        )}
      </Modal>

      {/* Печать-подтверждение после действия (задача 5.3/5.4) */}
      <StampOverlay
        action={stamp}
        onClose={() => {
          setStamp(null);
          if (onClosed) onClosed();
        }}
      />
    </>
  );
}

export default StatusActions;
