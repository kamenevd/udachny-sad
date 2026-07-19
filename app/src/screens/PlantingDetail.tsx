/**
 * PlantingDetail — экран посадки (задача 4.4).
 * PlantCard с реальными данными (plantings.getById), статус,
 * кнопки «Записать событие» и действия статуса (этап 5).
 */

import { useEffect, useMemo, useState } from 'react';
import { useRealtimeJournal } from '../hooks/useRealtimeJournal';
import { getById, getActive, type PlantingWithDetails, type PlantingWithPlant } from '../lib/pbPlantings';
import { deletePhotosFor } from '../lib/pbBackup';
import { useSafePbAction } from "../hooks/useSafePbAction";
import { Button } from '../components/Button';
import { PlantCard } from '../components/PlantCard';
import { formatRuDate } from '../components/PlantingForm';
import { plantTypeLabel } from './Plants';
import { objectTypeInfo } from '../components/canvas/EditorToolbar';
import { EventForm, eventTypeInfo, severityLabel } from '../components/EventForm';
import type { EventFormTarget } from '../components/EventForm';
import { Modal } from '../components/Modal';
import { StampOverlay } from '../components/StampOverlay';
import { StatusActions } from '../components/StatusActions';
import { SkeletonLines, PlantCardSkeleton, LoadingAnnouncer } from '../components/Skeleton';
import { PhotoUpload } from '../components/PhotoUpload';
import { PhotoGallery } from '../components/PhotoGallery';
import { SkipLink } from '../components/SkipLink';
import { AiCareTip } from '../components/AiCareTip';
import { useSwipe } from '../hooks/useSwipe';
import { useWateringReminder } from '../hooks/useWateringReminder';
import { WateringBanner } from '../components/WateringBanner';
import '../utils/printStyles.css';

export const PLANTING_STATUS_LABELS: Record<string, string> = {
  active: 'Растёт',
  dead: 'Погибло',
  completed: 'Завершено',
  transplanted: 'Пересажено',
};

export function plantingStatusLabel(status: string): string {
  return PLANTING_STATUS_LABELS[status] ?? status;
}

/** Сколько записей журнала показываем за раз (задача 18.2) */
const EVENTS_PAGE_SIZE = 20;

/** Стабильный псевдо-номер карточки из Id (для штампа «Учётная карточка №») */
function cardNumberFromId(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) % 999;
  return n + 1;
}

interface PlantingDetailProps {
  plantingId: string;
  onBack: () => void;
  /** Перейти к другой посадке того же участка (свайп, задача 34.1) */
  onNavigate?: (plantingId: string) => void;
}

export function PlantingDetail({ plantingId, onBack, onNavigate }: PlantingDetailProps) {
  const [planting, setPlanting] = useState<PlantingWithDetails | null | undefined>(undefined);
  // K.2: журнал через realtime-подписку PocketBase + оптимистичные мутации.
  const { events, reload: reloadEvents, removeEvent: removeEventOptimistic } =
    useRealtimeJournal(plantingId);
  const removeEvent = useSafePbAction(async (eventId: string) => {
    await deletePhotosFor('journalEvent', eventId);
    await removeEventOptimistic(eventId);
  });

  const loadPlanting = async () => {
    setPlanting(await getById(plantingId));
  };

  useEffect(() => {
    setPlanting(undefined);
    void loadPlanting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantingId]);

  // Соседние посадки участка — для свайп-навигации (задача 34.1)
  const [siblings, setSiblings] = useState<PlantingWithPlant[] | undefined>(undefined);
  useEffect(() => {
    if (!planting) {
      setSiblings(undefined);
      return;
    }
    void getActive(planting.gardenId).then(setSiblings);
  }, [planting?.gardenId]);

  const sortedSiblings = useMemo(
    () =>
      siblings
        ? [...siblings].sort((a, b) => new Date(a.plantedAt).getTime() - new Date(b.plantedAt).getTime())
        : [],
    [siblings],
  );
  const siblingIndex = sortedSiblings.findIndex((p) => p.id === plantingId);
  const prevPlanting = siblingIndex > 0 ? sortedSiblings[siblingIndex - 1] : undefined;
  const nextPlanting =
    siblingIndex >= 0 && siblingIndex < sortedSiblings.length - 1
      ? sortedSiblings[siblingIndex + 1]
      : undefined;

  const swipeRef = useSwipe<HTMLDivElement>({
    onSwipeLeft: () => nextPlanting && onNavigate?.(nextPlanting.id),
    onSwipeRight: () => prevPlanting && onNavigate?.(prevPlanting.id),
  });

  const [showEventForm, setShowEventForm] = useState(false);
  const [editEvent, setEditEvent] = useState<EventFormTarget | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [stampAction, setStampAction] = useState<string | null>(null);
  const [eventBusy, setEventBusy] = useState(false);
  const [visibleEventsCount, setVisibleEventsCount] = useState(EVENTS_PAGE_SIZE);

  const handleEventDelete = async () => {
    if (!deleteEventId) return;
    setEventBusy(true);
    try {
      // Оптимистичное удаление + realtime уже обновят список.
      await removeEvent.mutate(deleteEventId);
    } finally {
      setEventBusy(false);
      setDeleteEventId(null);
    }
  };

  const cardNumber = useMemo(() => cardNumberFromId(plantingId), [plantingId]);

  const placeLabel = useMemo(() => {
    if (!planting?.schemaObject) return planting?.positionNote;
    const info = objectTypeInfo(planting.schemaObject.type);
    const base = planting.schemaObject.label ?? info.label;
    return planting.positionNote ? `${base} — ${planting.positionNote}` : base;
  }, [planting]);

  // Предупреждение о долгом отсутствии полива (задача 35.3)
  const wateringReminder = useWateringReminder(planting?.status, planting?.plantedAt, events);

  return (
    <>
      <SkipLink />
      <div ref={swipeRef} className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b-2 border-ink bg-paper px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-ink"
          aria-label="Назад"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1
          className="truncate font-poster text-[21px] uppercase tracking-[0.03em] text-ink"
          style={{ fontWeight: 700 }}
        >
          {planting?.plant
            ? `${planting.plant.name}${planting.plant.variety ? ` «${planting.plant.variety}»` : ''}`
            : 'Посадка'}
        </h1>
        {/* Навигация между посадками участка (задача 34.1) — свайп или стрелки */}
        {(prevPlanting || nextPlanting) && (
          <div className="ml-auto flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => prevPlanting && onNavigate?.(prevPlanting._id)}
              disabled={!prevPlanting}
              className="rounded-lg p-1.5 text-ink transition-colors hover:bg-ink/10 disabled:opacity-20"
              aria-label="Предыдущая посадка"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => nextPlanting && onNavigate?.(nextPlanting._id)}
              disabled={!nextPlanting}
              className="rounded-lg p-1.5 text-ink transition-colors hover:bg-ink/10 disabled:opacity-20"
              aria-label="Следующая посадка"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </header>

      <main id="main-content" className="mx-auto max-w-2xl p-4 pb-28">
        {planting === undefined ? (
          <div className="flex flex-col gap-4">
            <LoadingAnnouncer />
            <PlantCardSkeleton />
            <SkeletonLines count={2} />
          </div>
        ) : planting === null ? (
          <div className="mt-20 text-center">
            <p className="mb-4 font-poster text-[21px] font-semibold uppercase text-ink">
              Посадка не найдена
            </p>
            <button
              type="button"
              onClick={onBack}
              className="font-mono text-[17px] text-blueink underline underline-offset-4"
            >
              ← Назад
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="print-plant-card">
              <PlantCard
                cardNumber={cardNumber}
                type={planting.plant ? plantTypeLabel(planting.plant.plantType) : undefined}
                name={
                  planting.plant
                    ? `${planting.plant.name}${planting.quantity ? ` × ${planting.quantity}` : ''}`
                    : undefined
                }
                variety={planting.plant?.variety}
                plantedAt={formatRuDate(new Date(planting.plantedAt).getTime())}
                status={
                  plantingStatusLabel(planting.status) +
                  (planting.endedAt ? ` (${formatRuDate(new Date(planting.endedAt).getTime())})` : '')
                }
                positionNote={placeLabel}
                className="w-full"
              />
            </div>

            <WateringBanner
              show={wateringReminder.shouldWarn}
              days={wateringReminder.daysSinceWatering}
              plantName={planting.plant?.name}
            />

            {planting.notes && (
              <div className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank">
                <div className="rounded-[6px] border border-ink p-4">
                  <p className="mb-1 font-poster text-[13px] uppercase tracking-[0.05em] text-ink-muted">
                    Заметка
                  </p>
                  <p className="text-[16px] leading-[1.5] text-ink">
                    {planting.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Действия — журнал (задача 5.1) и статусы (задача 5.4) */}
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setShowEventForm(true)}
              >
                ✍️ Записать событие
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => window.print()}
              >
                🖨️ Распечатать карточку
              </Button>
            </div>

            {/* Совет ИИ по уходу (задача 32.3) */}
            <AiCareTip plantingId={plantingId} />

            {/* Действия статуса (задача 5.4): пересадка, гибель, завершение */}
            {planting.gardenId && (
              <StatusActions
                plantingId={plantingId}
                gardenId={planting.gardenId}
                status={planting.status}
                onClosed={onBack}
              />
            )}

            {/* Лента событий журнала (задача 5.2), свежие сверху */}
            <section className="mt-2">
              <h2 className="mb-3 font-poster text-[14px] font-semibold uppercase tracking-[0.04em] text-ink">
                Журнал наблюдений
              </h2>
              {events === undefined ? (
                <div className="flex flex-col gap-2">
                  <div className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank animate-pulse" aria-hidden="true">
                    <div className="rounded-[6px] border border-ink p-3">
                      <div className="h-[15px] w-2/3 rounded bg-ink/10" />
                    </div>
                  </div>
                </div>
              ) : events.length === 0 ? (
                <p className="py-4 text-center text-[15px] leading-[1.5] text-ink-muted">
                  Записей пока нет. Что вижу — то пишу!
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {events.slice(0, visibleEventsCount).map((ev) => {
                    const info = eventTypeInfo(ev.eventType);
                    return (
                      <li
                        key={ev.id}
                        className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank"
                      >
                        <div className="rounded-[6px] border border-ink p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[18px]">{info.icon}</span>
                              <span className="font-poster text-[15px] font-semibold uppercase text-ink">
                                {info.label}
                              </span>
                              <span className="font-mono text-[13px] text-blueink">
                                {formatRuDate(new Date(ev.eventDate).getTime())}
                              </span>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() => setEditEvent({ ...ev, _id: ev.id })}
                                aria-label="Править запись"
                                className="rounded-lg p-1.5 text-ink transition-colors hover:bg-ink/10"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteEventId(ev.id)}
                                aria-label="Удалить запись"
                                className="rounded-lg p-1.5 text-red transition-colors hover:bg-red/10"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          {ev.title && (
                            <p className="mt-1 text-[16px] font-semibold text-ink">
                              {ev.title}
                            </p>
                          )}
                          {ev.description && (
                            <p className="mt-0.5 text-[15px] leading-[1.5] text-ink">
                              {ev.description}
                            </p>
                          )}
                          {ev.metadata?.diagnosis && (
                            <p className="mt-1 font-mono text-[14px] text-red">
                              Диагноз: {ev.metadata.diagnosis}
                              {ev.metadata.severity
                                ? ` (${severityLabel(ev.metadata.severity).toLowerCase()})`
                                : ''}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {events !== undefined && events.length > visibleEventsCount && (
                <Button
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => setVisibleEventsCount((n) => n + EVENTS_PAGE_SIZE)}
                >
                  Показать ещё ({events.length - visibleEventsCount})
                </Button>
              )}
            </section>

            {/* Фото: загрузка (задача 6.1) и галерея (задача 6.2) */}
            <PhotoGallery ownerType="planting" ownerId={plantingId} />
            <PhotoUpload ownerType="planting" ownerId={plantingId} />


            {/* Форма события: создание и правка (задачи 5.1–5.2) */}
            <EventForm
              open={showEventForm || editEvent !== null}
              plantingId={plantingId}
              event={editEvent}
              onClose={() => {
                setShowEventForm(false);
                setEditEvent(null);
              }}
              onSaved={() => {
                setStampAction(editEvent ? 'ЗАПИСАНО' : 'ЗАПИСАНО');
                void reloadEvents();
              }}
            />

            {/* Печать-подтверждение после сохранения события (задача 5.3) */}
            <StampOverlay action={stampAction} onClose={() => setStampAction(null)} />

            {/* Подтверждение удаления записи (задача 5.2) */}
            <Modal
              open={deleteEventId !== null}
              title="Удалить запись?"
              confirmVariant="danger"
              confirmText={eventBusy ? 'Удаляем…' : 'Удалить'}
              cancelText="Отмена"
              onConfirm={() => void handleEventDelete()}
              onCancel={() => setDeleteEventId(null)}
            >
              Запись журнала и её фото будут удалены безвозвратно.
            </Modal>
          </div>
        )}
      </main>
    </div>
    </>
  );
}
