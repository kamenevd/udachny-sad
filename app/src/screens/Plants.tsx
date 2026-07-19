/**
 * Plants — экран «Справочник растений» (задача 4.1).
 * Registry-списки по типам + форма создания (тип, название, сорт).
 */

import { useEffect, useMemo, useState, useDeferredValue } from 'react';
import { pb, plants as plantsApi, type Plant } from '../lib/pb';
import { useSafePbAction } from '../hooks/useSafePbAction';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Registry } from '../components/Registry';
import { SkipLink } from '../components/SkipLink';
import { SkeletonList, LoadingAnnouncer } from '../components/Skeleton';
import { PullToRefreshIndicator } from '../components/PullToRefreshIndicator';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useToast } from '../components/Toast';

export const PLANT_TYPES: { type: string; label: string; plural: string }[] = [
  { type: 'tree', label: 'Дерево', plural: 'Деревья' },
  { type: 'shrub', label: 'Кустарник', plural: 'Кустарники' },
  { type: 'perennial', label: 'Многолетник', plural: 'Многолетники' },
  { type: 'annual', label: 'Однолетник', plural: 'Однолетники' },
];

export function plantTypeLabel(type: string): string {
  return PLANT_TYPES.find((t) => t.type === type)?.label ?? type;
}

interface PlantsProps {
  onBack: () => void;
}

export function Plants({ onBack }: PlantsProps) {
  const [plants, setPlants] = useState<Plant[] | undefined>(undefined);
  const createPlant = useSafePbAction(
    (data: { plantType: string; name: string; variety?: string }) =>
      plantsApi.create({ ...data, userId: pb.authStore.record?.id ?? '' }),
  );
  const { showToast } = useToast();

  const loadPlants = async () => {
    const list = await plantsApi.list({ sort: 'name' });
    setPlants(list);
  };

  useEffect(() => {
    void loadPlants();
  }, []);

  // Pull-to-refresh (задача 34.2): принудительно перечитываем справочник.
  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await loadPlants();
    },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [plantType, setPlantType] = useState('perennial');
  const [name, setName] = useState('');
  const [variety, setVariety] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  // Секции реестра по типам; нумерация сквозная.
  // useDeferredValue даёт debounce-эффект — поиск не блокирует ввод.
  const sections = useMemo(() => {
    const list = plants ?? [];
    const q = deferredSearch.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.variety?.toLowerCase().includes(q) ?? false),
        )
      : list;
    let n = 0;
    return PLANT_TYPES.map((t) => ({
      ...t,
      items: filtered
        .filter((p) => p.plantType === t.type)
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map((p) => ({
          number: ++n,
          title: p.name,
          meta: p.variety,
        })),
    })).filter((s) => s.items.length > 0);
  }, [plants, deferredSearch]);

  const handleCreate = async () => {
    if (!name.trim()) return setError('Введите название растения');
    setError('');
    setBusy(true);
    try {
      await createPlant.mutate({
        plantType,
        name: name.trim(),
        variety: variety.trim() || undefined,
      });
      showToast("Растение добавлено", "success");
      setShowCreate(false);
      setName('');
      setVariety('');
      await loadPlants();
    } catch {
      setError('Не получилось сохранить. Проверьте связь и попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SkipLink />
      <div className="min-h-screen bg-paper">
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
          className="font-poster text-[21px] uppercase tracking-[0.03em] text-ink"
          style={{ fontWeight: 700 }}
        >
          Справочник растений
        </h1>
      </header>

      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      <main id="main-content" className="mx-auto max-w-2xl p-4 pb-28">
        {plants === undefined ? (
          <div className="mt-6">
            <LoadingAnnouncer />
            <SkeletonList count={4} />
          </div>
        ) : plants.length === 0 ? (
          <div className="mt-20 text-center">
            <div className="mb-4 text-6xl">🌻</div>
            <p className="mb-2 font-poster text-[21px] font-semibold uppercase text-ink">
              Каждому растению — карточку!
            </p>
            <p className="mb-6 text-[17px] leading-[1.55] text-ink-muted">
              Заведите первое растение — яблоню, смородину или флоксы
            </p>
            <Button
              variant="primary"
              onClick={() => setShowCreate(true)}
              className="mx-auto max-w-xs"
            >
              + Добавить растение
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {plants.length > 3 && (
              <Input
                label="Поиск"
                placeholder="Яблоня, смородина, флоксы…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Поиск по растениям"
              />
            )}
            {sections.length === 0 ? (
              <div className="mt-12 text-center">
                <div className="mb-3 text-4xl">🔍</div>
                <p className="font-poster text-[17px] font-semibold uppercase text-ink-muted">
                  Ничего не нашлось
                </p>
                <p className="mt-1 text-[15px] text-ink-muted">
                  Попробуйте изменить запрос
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {sections.map((s) => (
                  <Registry key={s.type} sectionTitle={s.plural} items={s.items} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Плавающая кнопка добавления */}
      {plants !== undefined && plants.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t-2 border-ink bg-paper p-3">
          <div className="mx-auto max-w-2xl">
            <Button
              variant="primary"
              onClick={() => setShowCreate(true)}
              className="w-full"
            >
              + Добавить растение
            </Button>
          </div>
        </div>
      )}

      {/* Форма создания */}
      <Modal
        open={showCreate}
        title="Новое растение"
        confirmText={busy ? 'Сохраняем…' : 'Записать'}
        cancelText="Отмена"
        onConfirm={() => void handleCreate()}
        onCancel={() => {
          setShowCreate(false);
          setError('');
        }}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 font-mono text-[14px] text-ink-muted">Тип</p>
            <div className="grid grid-cols-2 gap-2">
              {PLANT_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setPlantType(t.type)}
                  className={[
                    'rounded-[8px] border-2 border-ink px-2 py-2',
                    'font-poster text-[14px] font-semibold uppercase',
                    plantType === t.type
                      ? 'bg-ink text-paper'
                      : 'bg-surface text-ink hover:bg-ink/10',
                  ].join(' ')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Название"
            placeholder="Яблоня"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Сорт (необязательно)"
            placeholder="Антоновка"
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
          />
          {error && <p className="text-[15px] font-mono text-red">{error}</p>}
        </div>
      </Modal>
    </div>
    </>
  );
}
