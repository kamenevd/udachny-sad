import { useEffect, useRef, useState } from "react";
import { pb, gardens as gardensApi, type Garden } from "../lib/pb";
import { logout } from "../lib/auth";
import { getStreakForGardens, type StreakResult } from "../lib/pbStats";
import { getFullExport, restoreFromBackup, removeGardenCascade } from "../lib/pbBackup";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Banner } from "../components/Banner";
import { OnboardingHint } from "../components/OnboardingHint";
import { GuidedTour } from "../components/GuidedTour";
import { SkeletonList, LoadingAnnouncer } from "../components/Skeleton";
import { useSafePbAction } from "../hooks/useSafePbAction";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "../components/PullToRefreshIndicator";
import { useToast } from "../components/Toast";
import { SkipLink } from '../components/SkipLink';
import { HighContrastToggle } from "../components/Header";
import { buildBackup, downloadBackup, type BackupData } from "../utils/exportJson";
import { readBackupFile } from "../utils/importJson";

interface GardensProps {
  onSelectGarden: (gardenId: string, gardenName: string) => void;
  onOpenPlants: () => void;
  onOpenDashboard: () => void;
}

/** Максимальная длина названия участка (задача 28.3). */
export const GARDEN_NAME_MAX_LENGTH = 60;

/**
 * Валидация полей формы создания участка (задача 28.3).
 * Возвращает текст ошибки или null, если всё ок.
 * Отдельная чистая функция — легко покрыть edge case тестами
 * (пустые строки, NaN/0/отрицательные width/length, превышение maxLength).
 */
export function validateGardenInput(
  name: string,
  width: string,
  length: string,
): string | null {
  const trimmedName = name.trim();
  if (!trimmedName) return "Введите название участка";
  if (trimmedName.length > GARDEN_NAME_MAX_LENGTH) return "Слишком длинное название";
  const w = parseFloat(width);
  if (!Number.isFinite(w) || w <= 0) return "Введите ширину в метрах";
  const l = parseFloat(length);
  if (!Number.isFinite(l) || l <= 0) return "Введите длину в метрах";
  return null;
}

export function Gardens({ onSelectGarden, onOpenPlants, onOpenDashboard }: GardensProps) {
  const [gardens, setGardens] = useState<Garden[] | undefined>(undefined);
  const [streak, setStreak] = useState<StreakResult | null>(null);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGardens = async () => {
    const list = await gardensApi.list({ sort: "-created" });
    setGardens(list);
    const streakResult = await getStreakForGardens(list.map((g) => g.id));
    setStreak(streakResult);
    return list;
  };

  useEffect(() => {
    void loadGardens();
  }, []);

  // Pull-to-refresh (задача 34.2): принудительно перечитываем список участков.
  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await loadGardens();
    },
  });

  const createGarden = useSafePbAction((data: { name: string; width: number; length: number }) => {
    const boundary =
      data.width && data.length
        ? { points: [[0, 0], [data.width, 0], [data.width, data.length], [0, data.length]] }
        : undefined;
    return gardensApi.create({ ownerId: pb.authStore.record?.id ?? "", name: data.name, boundary });
  });
  const removeGarden = useSafePbAction((gardenId: string) => removeGardenCascade(gardenId));
  const restoreBackup = useSafePbAction((data: BackupData) => restoreFromBackup(data));

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [importing, setImporting] = useState(false);

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const data = await getFullExport();
      downloadBackup(buildBackup(data));
      showToast("Бэкап скачан", "success");
    } catch {
      showToast("Не получилось создать бэкап", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPendingBackup(await readBackupFile(file));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не получилось прочитать файл", "error");
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingBackup) return;
    setImporting(true);
    try {
      await restoreBackup.mutate(pendingBackup);
      showToast("Данные восстановлены из бэкапа", "success");
      setPendingBackup(null);
      await loadGardens();
    } catch {
      // useSafePbAction уже показал toast с ошибкой
    } finally {
      setImporting(false);
    }
  };

  const handleCreate = async () => {
    const validationError = validateGardenInput(name, width, length);
    if (validationError) return setError(validationError);
    setError("");
    setBusy(true);
    try {
      // MVP-ограничение: один участок на пользователя (было в convex/gardens.ts create).
      if (gardens && gardens.length > 0) {
        throw new Error("уже есть участок");
      }
      await createGarden.mutate({ name: name.trim(), width: parseFloat(width), length: parseFloat(length) });
      showToast("Участок добавлен", "success");
      setShowCreate(false);
      setName("");
      setWidth("");
      setLength("");
      await loadGardens();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        message.includes("уже есть участок")
          ? "У вас уже есть участок. В MVP доступен только один."
          : "Не получилось сохранить. Проверьте связь и попробуйте ещё раз.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await removeGarden.mutate(deleteTarget);
      showToast("Участок списан", "success");
      await loadGardens();
    } finally {
      setBusy(false);
      setDeleteTarget(null);
    }
  };

  const gardenSize = (boundary?: { points: number[][] }) => {
    if (!boundary || boundary.points.length < 3) return null;
    return `${boundary.points[1]?.[0]} × ${boundary.points[2]?.[1]} м`;
  };

  return (
    <>
      <SkipLink />
      {/* Онбординг-тур для нового пользователя (задача 34.3) */}
      <GuidedTour />
      <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-paper px-4 py-4">
        <div className="flex items-center gap-3">
          <h1
            className="font-poster text-[30px] uppercase tracking-[0.03em] text-ink"
            style={{ fontWeight: 700 }}
          >
            Мои участки
          </h1>
          {streak && streak.days >= 2 && (
            <Banner days={streak.days} />
          )}
        </div>
        <div className="flex items-center gap-1">
          <HighContrastToggle />
          <button
            type="button"
            onClick={onOpenDashboard}
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-ink/10"
            aria-label="Дашборд статистики"
            title="Дашборд статистики"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M18 17V9M13 17V5M8 17v-4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void handleExportBackup()}
            disabled={exporting}
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-ink/10 disabled:opacity-50"
            aria-label="Скачать бэкап данных (JSON)"
            title="Скачать бэкап данных (JSON)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-ink/10"
            aria-label="Восстановить из бэкапа (JSON)"
            title="Восстановить из бэкапа (JSON)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4" />
              <path d="M7 14l5-5 5 5" />
              <path d="M12 9v12" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => void handleImportFileChange(e)}
          />
          <button
            type="button"
            onClick={() => setConfirmSignOut(true)}
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-ink/10"
            aria-label="Выйти"
            title="Выйти"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </header>

      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      <main id="main-content" className="mx-auto max-w-2xl p-4">
        {gardens === undefined ? (
          <div className="mt-6">
            <LoadingAnnouncer />
            <SkeletonList count={3} />
          </div>
        ) : gardens.length === 0 ? (
          <div className="mt-20 text-center">
            <div className="mb-4 text-6xl">🌱</div>
            <p className="mb-2 font-poster text-[21px] font-semibold uppercase text-ink">
              Ни одной грядки без записи!
            </p>
            <p className="mb-6 text-[17px] leading-[1.55] text-ink-muted">
              Добавьте первый — дом или грядку
            </p>
            <Button
              variant="primary"
              onClick={() => setShowCreate(true)}
              className="mx-auto max-w-xs"
            >
              + Добавить участок
            </Button>
            <div className="mx-auto mt-6 max-w-sm text-left">
              <OnboardingHint step="first-garden" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {gardens.map((g) => (
              <div
                key={g.id}
                className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank"
              >
                <div className="flex items-center justify-between rounded-[6px] border border-ink p-4">
                  <button
                    onClick={() => onSelectGarden(g.id, g.name)}
                    className="flex-1 text-left"
                  >
                    <div className="font-poster text-[17px] text-ink">
                      {g.name}
                    </div>
                    {gardenSize(g.boundary) && (
                      <div className="font-mono text-[15px] text-blueink">
                        {gardenSize(g.boundary)}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(g.id)}
                    className="ml-3 rounded-lg p-2 text-red transition-colors hover:bg-red/10"
                    aria-label="Удалить участок"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6">
          <Button variant="secondary" onClick={onOpenPlants} className="w-full">
            🌻 Справочник растений
          </Button>
        </div>
      </main>

      {/* Модалка создания */}
      <Modal
        open={showCreate}
        title="Новый участок"
        confirmText={busy ? "Сохраняем…" : "Создать"}
        cancelText="Отмена"
        onConfirm={() => void handleCreate()}
        onCancel={() => {
          setShowCreate(false);
          setError("");
        }}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Название"
            placeholder="Дача в Малинниках"
            value={name}
            maxLength={GARDEN_NAME_MAX_LENGTH}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-3">
            <Input
              label="Ширина, м"
              type="number"
              placeholder="20"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
            <Input
              label="Длина, м"
              type="number"
              placeholder="30"
              value={length}
              onChange={(e) => setLength(e.target.value)}
            />
          </div>
          {error && <p className="text-[15px] font-mono text-red">{error}</p>}
        </div>
      </Modal>

      {/* Модалка удаления */}
      <Modal
        open={deleteTarget !== null}
        title="Списать участок?"
        confirmVariant="danger"
        confirmText={busy ? "Списываем…" : "Списать"}
        cancelText="Отмена"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      >
        Удалятся схема, посадки и записи журнала. Это действие необратимо.
      </Modal>

      {/* Подтверждение восстановления из бэкапа (задача 31.4) */}
      <Modal
        open={pendingBackup !== null}
        title="Восстановить из бэкапа?"
        confirmVariant="danger"
        confirmText={importing ? "Восстанавливаем…" : "Восстановить"}
        cancelText="Отмена"
        onConfirm={() => void handleConfirmImport()}
        onCancel={() => setPendingBackup(null)}
      >
        Все текущие данные (участки, схема, посадки, журнал) будут заменены
        данными из файла. Это действие необратимо.
      </Modal>

      {/* Подтверждение выхода (задача 10.3) */}
      <Modal
        open={confirmSignOut}
        title="Точно выходим?"
        confirmText="Выйти"
        cancelText="Остаться"
        onConfirm={() => {
          setConfirmSignOut(false);
          logout();
        }}
        onCancel={() => setConfirmSignOut(false)}
      >
        Все данные сохранены на сервере. Вернуться можно в любой момент.
      </Modal>
    </div>
    </>
  );
}
