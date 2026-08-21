/**
 * PlotEditor — экран редактора плана участка (EDITOR.md).
 *
 * Модель «поставил — подвинул»: меню «Добавить» сразу ставит объект
 * стандартного размера в центр экрана по сетке. Прямые углы гарантированы
 * конструкцией (параметрические формы), автосохранение — после каждого
 * законченного действия, undo/redo — до 50 шагов.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  gardens as gardensApi,
  schemaObjects as schemaObjectsApi,
  lightZones as lightZonesApi,
  plantings as plantingsApi,
  type Garden,
  type SchemaObjectType,
} from '../lib/pb';
import { getActive, type PlantingWithPlant } from '../lib/pbPlantings';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { StampOverlay } from '../components/StampOverlay';
import {
  type EditorDoc,
  type EditorItem,
  type EditorObject,
  type EditorZone,
  type ZoneCondition,
  EMPTY_DOC,
  nextTempId,
  isTempId,
  objectTypeDef,
  makeZoneShape,
  objectFromRecord,
  zoneFromRecord,
  findItem,
} from './model';
import {
  type Shape,
  moveShape,
  snapShapePosition,
  shapeCenter,
  pointInShape,
  round2,
  GRID,
} from './geometry';
import {
  initHistory,
  commit,
  undo,
  redo,
  canUndo,
  canRedo,
  addItem,
  updateItem,
  removeItem,
  remapId,
  type History,
} from './history';
import { EditorSync, pbTransport, type SyncStatus } from './sync';
import { type Viewport, fitPlot, zoomAt, clampToPlot, screenToWorld } from './view';
import { EditorCanvas } from './EditorCanvas';
import { AddMenu } from './AddMenu';
import { Inspector } from './Inspector';
import { PlantPicker } from './PlantPicker';

const DEFAULT_PLOT_W = 20;
const DEFAULT_PLOT_H = 30;

interface PlotEditorProps {
  gardenId: string;
  gardenName: string;
  onBack: () => void;
}

export function PlotEditor({ gardenId, gardenName, onBack }: PlotEditorProps) {
  // ─── Загрузка ─────────────────────────────────────────────────────────
  const [garden, setGarden] = useState<Garden | null | undefined>(undefined);
  const [history, setHistory] = useState<History | null>(null);
  const [loadError, setLoadError] = useState(false);
  const syncRef = useRef<EditorSync | null>(null);
  const [status, setStatus] = useState<SyncStatus>('saved');

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [g, objects, zones] = await Promise.all([
          gardensApi.getOne(gardenId),
          schemaObjectsApi.list({ filter: `gardenId="${gardenId}"`, sort: 'created' }),
          lightZonesApi.list({ filter: `gardenId="${gardenId}"` }),
        ]);
        if (cancelled) return;
        const doc: EditorDoc = {
          objects: objects.map(objectFromRecord).filter((o): o is EditorObject => o !== null),
          zones: zones.map(zoneFromRecord).filter((z): z is EditorZone => z !== null),
        };
        setGarden(g);
        setHistory(initHistory(doc));
        setZonesVisible(doc.zones.length > 0);
        syncRef.current = new EditorSync({
          gardenId,
          transport: pbTransport(),
          initial: doc,
          onStatus: (s) => {
            if (!cancelled) setStatus(s);
          },
          onIdRemap: (tempId, realId) => {
            if (cancelled) return;
            setHistory((h) => (h ? remapId(h, tempId, realId) : h));
            setSelectedId((s) => (s === tempId ? realId : s));
          },
        });
      } catch {
        if (!cancelled) {
          setGarden(null);
          setLoadError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gardenId]);

  const doc = history?.present ?? EMPTY_DOC;

  // ─── Размер участка ───────────────────────────────────────────────────
  const { plotW, plotH } = useMemo(() => {
    const pts = garden?.boundary?.points;
    if (!pts || pts.length < 3) return { plotW: DEFAULT_PLOT_W, plotH: DEFAULT_PLOT_H };
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return {
      plotW: Math.max(...xs) - Math.min(...xs) || DEFAULT_PLOT_W,
      plotH: Math.max(...ys) - Math.min(...ys) || DEFAULT_PLOT_H,
    };
  }, [garden]);

  // ─── Вьюпорт ──────────────────────────────────────────────────────────
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const viewSizeRef = useRef({ w: 0, h: 0 });
  const handleViewSize = useCallback(
    (w: number, h: number) => {
      viewSizeRef.current = { w, h };
      setViewport((vp) => vp ?? (garden !== undefined ? fitPlot(plotW, plotH, w, h) : vp));
    },
    [garden, plotW, plotH],
  );
  // Данные пришли после измерения канвы — вписываем при первой возможности
  useEffect(() => {
    if (garden === undefined) return;
    const { w, h } = viewSizeRef.current;
    if (w > 0 && h > 0) setViewport((vp) => vp ?? fitPlot(plotW, plotH, w, h));
  }, [garden, plotW, plotH]);

  const fitView = useCallback(() => {
    const { w, h } = viewSizeRef.current;
    if (w > 0 && h > 0) setViewport(fitPlot(plotW, plotH, w, h));
  }, [plotW, plotH]);

  const zoomButtons = useCallback(
    (factor: number) => {
      setViewport((vp) => {
        if (!vp) return vp;
        const { w, h } = viewSizeRef.current;
        return clampToPlot(zoomAt(vp, { x: w / 2, y: h / 2 }, factor), plotW, plotH, w, h);
      });
    },
    [plotW, plotH],
  );

  // ─── Правки документа ─────────────────────────────────────────────────
  const commitDoc = useCallback((next: EditorDoc) => {
    setHistory((h) => {
      if (!h) return h;
      const committed = commit(h, next);
      if (committed !== h) syncRef.current?.push(committed.present);
      return committed;
    });
  }, []);

  const handleShapeCommit = useCallback(
    (id: string, shape: Shape) => {
      commitDoc(updateItem(doc, id, { shape }));
    },
    [doc, commitDoc],
  );

  const handlePatch = useCallback(
    (patch: Partial<EditorItem>) => {
      if (!selectedId) return;
      commitDoc(updateItem(doc, selectedId, patch));
    },
    [doc, selectedId, commitDoc],
  );

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (!h || !canUndo(h)) return h;
      const next = undo(h);
      syncRef.current?.push(next.present);
      return next;
    });
    setSelectedId(null);
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((h) => {
      if (!h || !canRedo(h)) return h;
      const next = redo(h);
      syncRef.current?.push(next.present);
      return next;
    });
    setSelectedId(null);
  }, []);

  // ─── Добавление ───────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [zonesVisible, setZonesVisible] = useState(false);
  const [magnet, setMagnet] = useState(true);

  /** Центр экрана в метрах листа, прижатый внутрь участка */
  const viewCenterWorld = useCallback((): { x: number; y: number } => {
    const vp = viewport;
    const { w, h } = viewSizeRef.current;
    const c = vp ? screenToWorld(vp, { x: w / 2, y: h / 2 }) : { x: plotW / 2, y: plotH / 2 };
    return {
      x: Math.min(plotW - 1, Math.max(1, c.x)),
      y: Math.min(plotH - 1, Math.max(1, c.y)),
    };
  }, [viewport, plotW, plotH]);

  const placeShape = useCallback(
    (base: Shape): Shape => {
      const c = viewCenterWorld();
      return snapShapePosition(moveShape(base, round2(c.x), round2(c.y)), GRID);
    },
    [viewCenterWorld],
  );

  const handleAddObject = useCallback(
    (type: SchemaObjectType) => {
      const def = objectTypeDef(type);
      const item: EditorObject = {
        id: nextTempId(),
        kind: 'object',
        type,
        shape: placeShape(def.makeShape()),
      };
      commitDoc(addItem(doc, item));
      setSelectedId(item.id);
      setAddOpen(false);
    },
    [doc, commitDoc, placeShape],
  );

  const handleAddZone = useCallback(
    (condition: ZoneCondition) => {
      const item: EditorZone = {
        id: nextTempId(),
        kind: 'zone',
        condition,
        shape: placeShape(makeZoneShape()),
      };
      commitDoc(addItem(doc, item));
      setZonesVisible(true);
      setSelectedId(item.id);
      setAddOpen(false);
    },
    [doc, commitDoc, placeShape],
  );

  // ─── Удаление (объект с посадками удалить нельзя) ────────────────────
  const [inspectorError, setInspectorError] = useState<string | null>(null);
  useEffect(() => setInspectorError(null), [selectedId]);

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    const item = findItem(doc, selectedId);
    if (!item) return;
    if (item.kind === 'object') {
      const realId = syncRef.current?.realId(selectedId) ?? selectedId;
      if (!isTempId(realId)) {
        try {
          const existing = await plantingsApi.list({ filter: `schemaObjectId="${realId}"` });
          if (existing.length > 0) {
            setInspectorError(
              'Здесь есть записи о посадках — удалить место нельзя, история должна сохраниться.',
            );
            return;
          }
        } catch {
          setInspectorError('Не получилось проверить посадки. Попробуйте ещё раз.');
          return;
        }
      }
    }
    commitDoc(removeItem(doc, selectedId));
    setSelectedId(null);
  }, [doc, selectedId, commitDoc]);

  // ─── Посадки ──────────────────────────────────────────────────────────
  const [plantings, setPlantings] = useState<PlantingWithPlant[]>([]);
  const refetchPlantings = useCallback(() => {
    getActive(gardenId)
      .then(setPlantings)
      .catch(() => {});
  }, [gardenId]);
  useEffect(refetchPlantings, [refetchPlantings]);

  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [stamp, setStamp] = useState<string | null>(null);

  const openPlantPicker = useCallback(async () => {
    if (!selectedId) return;
    // Объект должен существовать на сервере, чтобы посадка на него сослалась
    const ok = await syncRef.current?.flush();
    if (!ok) {
      setInspectorError('Объект ещё не сохранился — проверьте связь и попробуйте ещё раз.');
      return;
    }
    const realId = syncRef.current?.realId(selectedId) ?? selectedId;
    if (isTempId(realId)) return;
    setPickerFor(realId);
  }, [selectedId]);

  const selected = selectedId ? findItem(doc, selectedId) : undefined;

  const selectedPlantings = useMemo(() => {
    if (!selected || selected.kind !== 'object') return [];
    const realId = syncRef.current?.realId(selected.id) ?? selected.id;
    return plantings.filter((p) => p.schemaObjectId === realId);
  }, [plantings, selected]);

  /** Зона света, в которую попадает центр выделенного объекта */
  const selectedZoneCondition = useMemo((): ZoneCondition | null => {
    if (!selected || selected.kind !== 'object') return null;
    const c = shapeCenter(selected.shape);
    const zone = doc.zones.find((z) => pointInShape(c, z.shape));
    return zone?.condition ?? null;
  }, [selected, doc.zones]);

  // ─── Клавиатура ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === 'Escape') {
        setAddOpen(false);
        setPickerFor(null);
        setSelectedId(null);
        return;
      }
      if (!selectedId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        void handleDelete();
        return;
      }
      const stepBy = e.shiftKey ? 0.1 : GRID;
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-stepBy, 0],
        ArrowRight: [stepBy, 0],
        ArrowUp: [0, -stepBy],
        ArrowDown: [0, stepBy],
      };
      const d = arrows[e.key];
      if (d) {
        e.preventDefault();
        const item = findItem(doc, selectedId);
        if (item) commitDoc(updateItem(doc, selectedId, { shape: moveShape(item.shape, d[0], d[1]) }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, selectedId, handleUndo, handleRedo, handleDelete, commitDoc]);

  // Предупреждение при уходе с несохранёнными правками
  useUnsavedChanges(status !== 'saved');

  const isDesktop = useMediaQuery('(min-width: 900px)');

  // ─── Экраны загрузки/ошибки ───────────────────────────────────────────
  if (garden === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4">
        <p className="mb-4 font-poster text-[21px] font-semibold uppercase text-ink">
          {loadError ? 'Не получилось открыть план' : 'Участок не найден'}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="font-mono text-[17px] text-blueink underline underline-offset-4"
        >
          ← Назад
        </button>
      </div>
    );
  }

  const undoDisabled = !history || !canUndo(history);
  const redoDisabled = !history || !canRedo(history);

  return (
    <div className="relative flex h-[100dvh] flex-col bg-surface" data-testid="plot-editor">
      {/* ═══ Шапка ═══ */}
      <header className="flex h-[56px] shrink-0 items-center gap-1 border-b-2 border-ink bg-paper px-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад"
          data-testid="editor-back"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-ink/10"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="min-w-0 flex-1 truncate font-poster text-[17px] font-semibold uppercase tracking-[0.03em] text-ink">
          {gardenName}
        </h1>

        {/* Статус сохранения */}
        <SaveStatus status={status} onRetry={() => syncRef.current?.retry()} />

        <button
          type="button"
          onClick={handleUndo}
          disabled={undoDisabled}
          aria-label="Отменить"
          data-testid="editor-undo"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-ink/10 disabled:opacity-30"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={redoDisabled}
          aria-label="Повторить"
          data-testid="editor-redo"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-ink/10 disabled:opacity-30"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
          </svg>
        </button>
      </header>

      {/* ═══ Канва + панель ═══ */}
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {history && viewportReady(viewport) ? (
            <EditorCanvas
              doc={doc}
              plotW={plotW}
              plotH={plotH}
              viewport={viewport!}
              onViewportChange={setViewport}
              onViewSize={handleViewSize}
              selectedId={selectedId}
              onSelect={setSelectedId}
              magnet={magnet}
              zonesVisible={zonesVisible}
              onShapeCommit={handleShapeCommit}
            />
          ) : (
            <MeasureCanvas onViewSize={handleViewSize} />
          )}

          {/* Плавающие инструменты слева сверху */}
          <div className="absolute left-2 top-2 flex flex-col gap-1.5">
            <ToolToggle
              active={magnet}
              onClick={() => setMagnet((v) => !v)}
              label="Магнит"
              testId="toggle-magnet"
              icon="🧲"
            />
            <ToolToggle
              active={zonesVisible}
              onClick={() => setZonesVisible((v) => !v)}
              label="Свет"
              testId="toggle-zones"
              icon="☀️"
            />
          </div>

          {/* Зум и «весь участок» справа сверху */}
          <div className="absolute right-2 top-2 flex flex-col gap-1.5">
            <ToolButton onClick={() => zoomButtons(1.4)} label="Приблизить" testId="zoom-in">
              <span className="font-poster text-[20px] font-semibold leading-none">+</span>
            </ToolButton>
            <ToolButton onClick={() => zoomButtons(1 / 1.4)} label="Отдалить" testId="zoom-out">
              <span className="font-poster text-[20px] font-semibold leading-none">−</span>
            </ToolButton>
            <ToolButton onClick={fitView} label="Весь участок" testId="zoom-fit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            </ToolButton>
          </div>

          {/* Пустой план: с чего начать */}
          {history && doc.objects.length === 0 && doc.zones.length === 0 && !addOpen && (
            <div className="pointer-events-none absolute inset-x-4 top-16 flex justify-center">
              <div className="rounded-[10px] border-2 border-ink bg-paper px-4 py-3 text-center shadow-blank">
                <p className="font-poster text-[15px] font-semibold uppercase text-ink">
                  План пока пустой
                </p>
                <p className="mt-1 max-w-[260px] font-mono text-[13px] leading-snug text-ink-muted">
                  Нажмите «Добавить» и поставьте дом — он появится ровным,
                  двигайте и меняйте размеры как удобно.
                </p>
              </div>
            </div>
          )}

          {/* Кнопка «Добавить» — по центру снизу; на телефоне прячется под шторкой */}
          {!(selected && !isDesktop) && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center">
              <button
                type="button"
                data-testid="editor-add"
                onClick={() => setAddOpen(true)}
                className="pointer-events-auto flex h-[52px] items-center gap-2 rounded-full border-2 border-ink bg-ink px-6 font-poster text-[16px] font-semibold uppercase tracking-[0.04em] text-paper shadow-blank transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                <span className="text-[22px] leading-none">+</span>
                Добавить
              </button>
            </div>
          )}

          {/* Мобильный инспектор — шторка поверх канвы */}
          {selected && !isDesktop && (
            <Inspector
              item={selected}
              variant="sheet"
              plantings={selectedPlantings}
              onPatch={handlePatch}
              onShape={(shape) => handleShapeCommit(selected.id, shape)}
              onDelete={() => void handleDelete()}
              onPlant={() => void openPlantPicker()}
              onClose={() => setSelectedId(null)}
              error={inspectorError}
            />
          )}

          {/* Меню добавления */}
          <AddMenu
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onAddObject={handleAddObject}
            onAddZone={handleAddZone}
          />

          {/* Подбор растения */}
          {pickerFor && (
            <PlantPicker
              open
              gardenId={gardenId}
              schemaObjectId={pickerFor}
              zoneCondition={selectedZoneCondition}
              onClose={() => setPickerFor(null)}
              onPlanted={() => {
                refetchPlantings();
                setStamp('ПОСАЖЕНО');
              }}
            />
          )}

          <StampOverlay action={stamp} onClose={() => setStamp(null)} />
        </div>

        {/* Десктопный инспектор — панель справа */}
        {selected && isDesktop && (
          <Inspector
            item={selected}
            variant="panel"
            plantings={selectedPlantings}
            onPatch={handlePatch}
            onShape={(shape) => handleShapeCommit(selected.id, shape)}
            onDelete={() => void handleDelete()}
            onPlant={() => void openPlantPicker()}
            onClose={() => setSelectedId(null)}
            error={inspectorError}
          />
        )}
      </div>
    </div>
  );
}

function viewportReady(vp: Viewport | null): vp is Viewport {
  return vp !== null;
}

/** Заглушка до первого измерения: даёт размер канвы через ResizeObserver */
function MeasureCanvas({ onViewSize }: { onViewSize: (w: number, h: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => onViewSize(el.clientWidth, el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} className="flex h-full items-center justify-center font-mono text-ink-muted">
      Загрузка плана…
    </div>
  );
}

// ─── Мелкие компоненты ──────────────────────────────────────────────────

function SaveStatus({ status, onRetry }: { status: SyncStatus; onRetry: () => void }) {
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        data-testid="save-status"
        data-status="error"
        className="mr-1 shrink-0 rounded-[6px] border-2 border-red bg-paper px-2 py-1 font-mono text-[12px] leading-tight text-red"
      >
        Не сохранилось · повторить
      </button>
    );
  }
  return (
    <span
      data-testid="save-status"
      data-status={status}
      className="mr-1 shrink-0 font-mono text-[12px] text-ink-muted"
      aria-live="polite"
    >
      {status === 'saving' ? 'Сохранение…' : '✓ Сохранено'}
    </span>
  );
}

function ToolToggle({
  active,
  onClick,
  label,
  icon,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      title={label}
      className={[
        'flex min-h-[44px] items-center gap-1.5 rounded-[8px] border-2 border-ink px-2.5',
        'font-poster text-[12px] font-semibold uppercase shadow-blank transition-colors',
        active ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink/10',
      ].join(' ')}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function ToolButton({
  onClick,
  label,
  testId,
  children,
}: {
  onClick: () => void;
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-[8px] border-2 border-ink bg-paper text-ink shadow-blank hover:bg-ink/10"
    >
      {children}
    </button>
  );
}

export default PlotEditor;
