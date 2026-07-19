/**
 * EventForm — форма события журнала (задача 5.1).
 * 11 типов по-русски, дата, заголовок, описание; спец-поля:
 * болезнь/вредитель (диагноз, тяжесть).
 * Работает и на создание, и на редактирование (задача 5.2).
 */

import { useEffect, useRef, useState } from 'react';
import { journalEvents as journalEventsApi, type EventType, type JournalEvent } from '../lib/pb';
import { useSafePbAction } from '../hooks/useSafePbAction';
import { Input } from './Input';
import { Modal } from './Modal';
import { parseRuDate, formatRuDate } from './PlantingForm';
import { PhotoGallery } from './PhotoGallery';
import { PhotoUpload } from './PhotoUpload';
import { PhotoDiagnosis } from './PhotoDiagnosis';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useQueuedPbAction } from '../hooks/useQueuedPbAction';
import { VoiceEventButton, type ParsedVoiceEvent } from './VoiceEventButton';

/** 11 типов событий журнала (§2.8 ARCHITECTURE) */
export const EVENT_TYPES: { type: string; label: string; icon: string }[] = [
  { type: 'planting', label: 'Посадка', icon: '🌱' },
  { type: 'watering', label: 'Полив', icon: '💧' },
  { type: 'blooming', label: 'Цветение', icon: '🌸' },
  { type: 'pruning', label: 'Обрезка', icon: '✂️' },
  { type: 'winterizing', label: 'Укрытие', icon: '❄️' },
  { type: 'disease', label: 'Болезнь', icon: '🦠' },
  { type: 'pest', label: 'Вредитель', icon: '🐛' },
  { type: 'fertilizing', label: 'Подкормка', icon: '🧪' },
  { type: 'transplant', label: 'Пересадка', icon: '🔁' },
  { type: 'death', label: 'Гибель', icon: '🥀' },
  { type: 'other', label: 'Другое', icon: '📝' },
];

export function eventTypeInfo(type: string): { type: string; label: string; icon: string } {
  return (
    EVENT_TYPES.find((t) => t.type === type) ?? {
      type,
      label: 'Другое',
      icon: '📝',
    }
  );
}

const SEVERITIES: { value: string; label: string }[] = [
  { value: 'mild', label: 'Лёгкая' },
  { value: 'moderate', label: 'Средняя' },
  { value: 'severe', label: 'Тяжёлая' },
];

export function severityLabel(value: string): string {
  return SEVERITIES.find((s) => s.value === value)?.label ?? value;
}

export interface EventFormTarget {
  _id: string;
  eventType: string;
  /** ISO-дата (PocketBase) */
  eventDate: string;
  title?: string;
  description?: string;
  metadata?: {
    diagnosis?: string;
    severity?: string;
  };
}

interface EventFormProps {
  open: boolean;
  plantingId: string;
  /** null/undefined — создание; иначе редактирование этого события */
  event?: EventFormTarget | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function EventForm({ open, plantingId, event, onClose, onSaved }: EventFormProps) {
  // Создание события — через очередь (задача 27.2): в поле, часто без связи,
  // запись «Полив» не должна теряться, а тихо доиграется при появлении сети.
  const createEvent = useQueuedPbAction(
    (args: Partial<JournalEvent>) => journalEventsApi.create(args),
    'journalEvents.create',
  );
  const updateEvent = useSafePbAction(
    (id: string, data: Partial<JournalEvent>) => journalEventsApi.update(id, data),
  );

  const [eventType, setEventType] = useState('watering');
  const [date, setDate] = useState(formatRuDate(Date.now()));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [severity, setSeverity] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const skipDirtyRef = useRef(false);

  // Инициализация при открытии: пустая форма или данные события
  useEffect(() => {
    if (!open) return;
    skipDirtyRef.current = true;
    setEventType(event?.eventType ?? 'watering');
    setDate(formatRuDate(event ? new Date(event.eventDate).getTime() : Date.now()));
    setTitle(event?.title ?? '');
    setDescription(event?.description ?? '');
    setDiagnosis(event?.metadata?.diagnosis ?? '');
    setSeverity(event?.metadata?.severity ?? '');
    setError('');
    setDirty(false);
  }, [open, event]);

  // Отмечаем форму «грязной» при любом изменении полей после инициализации
  useEffect(() => {
    if (!open) return;
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false;
      return;
    }
    setDirty(true);
  }, [open, eventType, date, title, description, diagnosis, severity]);

  useUnsavedChanges(open && dirty && !busy);

  const isAilment = eventType === 'disease' || eventType === 'pest';

  // Задача G.2 — голосовой ввод: тип события из глагола, остаток фразы в описание.
  const handleVoiceResult = ({ eventType: vt, note }: ParsedVoiceEvent) => {
    setEventType(vt);
    if (note) setDescription((prev) => (prev.trim() ? prev : note));
  };

  const handleSubmit = async () => {
    const eventDateMs = parseRuDate(date);
    if (!eventDateMs) return setError('Дата — в формате дд.мм.гггг');
    const eventDate = new Date(eventDateMs).toISOString();

    // metadata собираем только из заполненных спец-полей
    let metadata:
      | {
          diagnosis?: string;
          severity?: string;
        }
      | undefined;
    if (isAilment && (diagnosis.trim() || severity)) {
      metadata = {
        diagnosis: diagnosis.trim() || undefined,
        severity: severity || undefined,
      };
    }

    setError('');
    setBusy(true);
    try {
      if (event) {
        await updateEvent.mutate(event._id, {
          eventType: eventType as EventType,
          eventDate,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          metadata,
        });
      } else {
        await createEvent.enqueueOrRun({
          plantingId,
          eventType: eventType as EventType,
          eventDate,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          metadata,
        });
      }
      onClose();
      onSaved?.();
    } catch {
      setError('Не получилось сохранить запись. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={event ? 'Правка записи' : 'Новая запись'}
      confirmText={busy ? 'Сохраняем…' : 'Записать'}
      cancelText="Отмена"
      onConfirm={() => void handleSubmit()}
      onCancel={onClose}
    >
      <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
        {/* Голосовой ввод (задача G.2) — не показываем при редактировании */}
        {!event && <VoiceEventButton onResult={handleVoiceResult} />}

        {/* Тип события */}
        <div>
          <p className="mb-2 font-mono text-[14px] text-ink-muted">Событие</p>
          <div className="grid grid-cols-3 gap-2">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => setEventType(t.type)}
                className={[
                  'flex flex-col items-center gap-0.5 rounded-[8px] border-2 border-ink px-1 py-1.5',
                  eventType === t.type
                    ? 'bg-ink text-paper'
                    : 'bg-surface text-ink hover:bg-ink/10',
                ].join(' ')}
              >
                <span className="text-[18px] leading-none">{t.icon}</span>
                <span className="font-mono text-[11px] leading-tight">
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Дата"
          placeholder="дд.мм.гггг"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          inputMode="numeric"
        />

        <Input
          label="Заголовок (необязательно)"
          placeholder="Первый полив сезона"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Input
          label="Описание (необязательно)"
          placeholder="Два ведра под корень"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Спец-поля: болезнь / вредитель */}
        {isAilment && (
          <div className="flex flex-col gap-3">
            <Input
              label="Диагноз"
              placeholder={eventType === 'disease' ? 'Мучнистая роса' : 'Тля'}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
            <div>
              <p className="mb-2 font-mono text-[14px] text-ink-muted">
                Тяжесть
              </p>
              <div className="flex gap-2">
                {SEVERITIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() =>
                      setSeverity(severity === s.value ? '' : s.value)
                    }
                    className={[
                      'flex-1 rounded-[8px] border-2 border-ink px-2 py-1.5',
                      'font-poster text-[13px] font-semibold uppercase',
                      severity === s.value
                        ? 'bg-ink text-paper'
                        : 'bg-surface text-ink hover:bg-ink/10',
                    ].join(' ')}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Фотографии события (задача 11.1) — только при редактировании */}
        {event && (
          <div className="border-t-2 border-ink/20 pt-3">
            <PhotoGallery
              ownerType="journalEvent"
              ownerId={event._id}
              title="Фото записи"
            />
            <PhotoUpload
              ownerType="journalEvent"
              ownerId={event._id}
              buttonText="📸 Добавить фото"
            />
            {/* Диагностика по фото (задача 32.2) — для болезни/вредителя */}
            {isAilment && (
              <div className="mt-3">
                <PhotoDiagnosis
                  journalEventId={event._id}
                  note={diagnosis}
                  onApply={setDiagnosis}
                />
              </div>
            )}
          </div>
        )}

        {error && <p className="font-mono text-[14px] text-red">{error}</p>}
      </div>
    </Modal>
  );
}
