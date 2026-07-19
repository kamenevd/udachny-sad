/**
 * PlantingForm — форма посадки (задача 4.2).
 * Растение из справочника или создание на месте; дата дд.мм.гггг,
 * количество, уточнение места, заметка → plantings.create.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { pb, plants as plantsApi, type Plant } from '../lib/pb';
import { createPlanting } from '../lib/pbPlantings';
import { useSafePbAction } from '../hooks/useSafePbAction';
import { Input } from './Input';
import { Modal } from './Modal';
import { PLANT_TYPES, plantTypeLabel } from '../screens/Plants';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { usePlantAutocomplete } from '../hooks/usePlantAutocomplete';

/** «дд.мм.гггг» → timestamp (полдень локального дня); null при ошибке */
export function parseRuDate(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  const d = new Date(year, month - 1, day, 12, 0, 0);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d.getTime();
}

/** timestamp → «дд.мм.гггг» */
export function formatRuDate(ts: number): string {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

interface PlantingFormProps {
  open: boolean;
  gardenId: string;
  /** Объект схемы, на который сажаем (может отсутствовать) */
  schemaObjectId?: string;
  onClose: () => void;
  /** Успешная посадка (для печати «ПОСАЖЕНО» и навигации) */
  onCreated?: (plantingId: string) => void;
}

export function PlantingForm({
  open,
  gardenId,
  schemaObjectId,
  onClose,
  onCreated,
}: PlantingFormProps) {
  const [plants, setPlants] = useState<Plant[] | undefined>(undefined);
  useEffect(() => {
    if (!open) return;
    void plantsApi.list({ sort: 'name' }).then(setPlants);
  }, [open]);
  const createPlant = useSafePbAction(
    (data: { plantType: string; name: string; variety?: string }) =>
      plantsApi.create({ ...data, userId: pb.authStore.record?.id ?? '' }),
  );

  const [plantId, setPlantId] = useState<string | null>(null);
  const [newPlantMode, setNewPlantMode] = useState(false);
  const [newPlantType, setNewPlantType] = useState('perennial');
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantVariety, setNewPlantVariety] = useState('');

  const [date, setDate] = useState(formatRuDate(Date.now()));
  const [quantity, setQuantity] = useState('');
  const [positionNote, setPositionNote] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const skipDirtyRef = useRef(false);

  // Сброс при каждом открытии
  useEffect(() => {
    if (open) {
      skipDirtyRef.current = true;
      setPlantId(null);
      setNewPlantMode(false);
      setNewPlantName('');
      setNewPlantVariety('');
      setSuggestPicked(false);
      setDate(formatRuDate(Date.now()));
      setQuantity('');
      setPositionNote('');
      setNotes('');
      setError('');
      setDirty(false);
    }
  }, [open]);

  // Отмечаем форму «грязной» при любом изменении полей после инициализации
  useEffect(() => {
    if (!open) return;
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false;
      return;
    }
    setDirty(true);
  }, [open, plantId, newPlantMode, newPlantType, newPlantName, newPlantVariety, date, quantity, positionNote, notes]);

  useUnsavedChanges(open && dirty && !busy);

  const sortedPlants = useMemo(
    () =>
      [...(plants ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [plants],
  );

  // I.1: подсказки сортов по вводу названия ИЛИ сорта (локальная база, офлайн).
  const [suggestPicked, setSuggestPicked] = useState(false);
  const suggestions = usePlantAutocomplete(
    suggestPicked ? '' : newPlantName || newPlantVariety,
  );

  const handleSubmit = async () => {
    const plantedAt = parseRuDate(date);
    if (!plantedAt) return setError('Дата — в формате дд.мм.гггг');

    const qty = quantity.trim() ? parseInt(quantity, 10) : undefined;
    if (quantity.trim() && (!qty || qty <= 0)) {
      return setError('Количество — целое число больше нуля');
    }

    if (newPlantMode && !newPlantName.trim()) {
      return setError('Введите название растения');
    }
    if (!newPlantMode && !plantId) {
      return setError('Выберите растение из справочника');
    }

    setError('');
    setBusy(true);
    try {
      let finalPlantId = plantId;
      if (newPlantMode) {
        const created = await createPlant.mutate({
          plantType: newPlantType,
          name: newPlantName.trim(),
          variety: newPlantVariety.trim() || undefined,
        });
        finalPlantId = created.id;
      }
      const planting = await createPlanting({
        gardenId,
        plantId: finalPlantId!,
        schemaObjectId,
        plantedAt: new Date(plantedAt).toISOString(),
        quantity: qty,
        positionNote: positionNote.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
      onCreated?.(planting.id);
    } catch {
      setError('Не получилось сохранить посадку. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Новая посадка"
      confirmText={busy ? 'Сажаем…' : 'Посадить'}
      cancelText="Отмена"
      onConfirm={() => void handleSubmit()}
      onCancel={onClose}
    >
      <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
        {/* Выбор растения */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[14px] text-ink-muted">Растение</p>
            <button
              type="button"
              onClick={() => setNewPlantMode(!newPlantMode)}
              className="font-mono text-[13px] text-blueink underline underline-offset-2"
            >
              {newPlantMode ? 'Выбрать из справочника' : '+ Новое растение'}
            </button>
          </div>

          {newPlantMode ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                {PLANT_TYPES.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setNewPlantType(t.type)}
                    className={[
                      'rounded-[8px] border-2 border-ink px-2 py-1.5',
                      'font-poster text-[13px] font-semibold uppercase',
                      newPlantType === t.type
                        ? 'bg-ink text-paper'
                        : 'bg-surface text-ink hover:bg-ink/10',
                    ].join(' ')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <Input
                label="Название"
                placeholder="Роза"
                value={newPlantName}
                onChange={(e) => {
                  setNewPlantName(e.target.value);
                  setSuggestPicked(false);
                }}
              />
              <Input
                label="Сорт (необязательно)"
                placeholder="Фламментанц"
                value={newPlantVariety}
                onChange={(e) => {
                  setNewPlantVariety(e.target.value);
                  setSuggestPicked(false);
                }}
              />
              {suggestions.length > 0 && (
                <div className="flex flex-col gap-1 rounded-[8px] border-2 border-ink/40 bg-surface p-1">
                  <p className="px-2 py-0.5 font-poster text-[11px] uppercase tracking-[0.05em] text-ink-muted">
                    Похожие сорта
                  </p>
                  {suggestions.map((s) => (
                    <button
                      key={`${s.name}-${s.variety}`}
                      type="button"
                      onClick={() => {
                        setNewPlantName(s.name);
                        setNewPlantVariety(s.variety);
                        setNewPlantType(s.type);
                        setSuggestPicked(true);
                      }}
                      className="flex items-baseline justify-between rounded-[6px] px-3 py-2 text-left text-ink hover:bg-ink/10"
                    >
                      <span className="text-[15px]">
                        {s.name} «{s.variety}»
                      </span>
                      <span className="font-mono text-[12px] text-ink-muted">
                        {plantTypeLabel(s.type)} · ~{s.heightCm} см
                        {s.bloom !== '—' ? ` · ${s.bloom}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : sortedPlants.length === 0 ? (
            <p className="text-[15px] leading-[1.5] text-ink-muted">
              Справочник пуст — добавьте растение кнопкой «+ Новое растение».
            </p>
          ) : (
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-[8px] border-2 border-ink p-1">
              {sortedPlants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlantId(p.id)}
                  className={[
                    'flex items-baseline justify-between rounded-[6px] px-3 py-2 text-left',
                    plantId === p.id
                      ? 'bg-ink text-paper'
                      : 'text-ink hover:bg-ink/10',
                  ].join(' ')}
                >
                  <span className="text-[15px]">
                    {p.name}
                    {p.variety ? ` «${p.variety}»` : ''}
                  </span>
                  <span
                    className={[
                      'font-mono text-[12px]',
                      plantId === p.id ? 'text-paper/70' : 'text-ink-muted',
                    ].join(' ')}
                  >
                    {plantTypeLabel(p.plantType)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Input
            label="Дата посадки"
            placeholder="дд.мм.гггг"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            inputMode="numeric"
          />
          <Input
            label="Кол-во"
            type="number"
            placeholder="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <Input
          label="Уточнение места (необязательно)"
          placeholder="Северный угол клумбы"
          value={positionNote}
          onChange={(e) => setPositionNote(e.target.value)}
        />

        <Input
          label="Заметка (необязательно)"
          placeholder="Саженец из питомника"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="font-mono text-[14px] text-red">{error}</p>}
      </div>
    </Modal>
  );
}
