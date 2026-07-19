/**
 * GardenDetail — экран участка с Konva-канвой и атрибутами генплана.
 * DESIGN.md v5.1 §3.1 (Лист), §3.2 (Объекты), §3.4 (Атрибуты), §6 (Шапка).
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  gardens as gardensApi,
  schemaObjects as schemaObjectsApi,
  lightZones as lightZonesApi,
  moistureZones as moistureZonesApi,
  plantings as plantingsApi,
  type Garden,
  type SchemaObject,
} from '../lib/pb';
import { getActive, type PlantingWithPlant } from '../lib/pbPlantings';
import { usePbCollection } from '../hooks/usePbCollection';
import type Konva from 'konva';
import {
  gridPattern,
  gridPattern5,
  grassPattern,
  gravelPattern,
  flowerPattern,
  buildingPattern,
} from '../theme/canvasPatterns';
import { getTimeOfDay, getSkyGradient, isNightMode } from '../theme/sky';
import { useExplicationData, groupKey, typeToRussian } from '../components/canvas/useExplicationData';
import type { SchemaObjectData } from '../components/canvas/useExplicationData';
import { CommandPalette } from '../components/CommandPalette';
import { centroidOf, type CanvasSearchItem } from '../hooks/useCanvasSearch';
import { pointInPolygon, type LightCondition } from '../lib/bedContext';
import type { SchemaObjectForNumber } from '../components/canvas/ObjectNumbers';
import { usePanZoom } from '../components/canvas/usePanZoom';
import { EditorToolbar, objectTypeInfo } from '../components/canvas/EditorToolbar';
import type { EditorMode } from '../components/canvas/EditorToolbar';
import { useDrawObject } from '../components/canvas/useDrawObject';
import { Explication } from '../components/Explication';
import { ObjectSheet } from '../components/ObjectSheet';
import { formatRuDate } from '../components/PlantingForm';
import { ZONE_CONDITIONS, zoneConditionLabel } from '../components/canvas/zoneConditions';
import type { ZoneLayerKind } from '../components/canvas/zoneConditions';
import { useDrawZone } from '../components/canvas/useDrawZone';
import { Modal } from '../components/Modal';
import { SkipLink } from '../components/SkipLink';
import { ExportPng } from '../components/canvas/ExportPng';
import { SearchOnCanvas } from '../components/canvas/SearchOnCanvas';

/** Konva (~357KB) грузится лениво — только когда экран реально показывает канву (задача 17.3) */
const GardenCanvasStage = lazy(() => import('../components/canvas/GardenCanvasStage'));

// ─── Props ───────────────────────────────────────────────────────────

interface GardenDetailProps {
  gardenId: string;
  gardenName: string;
  onBack: () => void;
  /** Открыть карточку посадки (экран PlantingDetail, задача 4.4) */
  onOpenPlanting?: (plantingId: string) => void;
  /** Открыть историю места (экран PlaceHistory, задача 5.5) */
  onOpenPlaceHistory?: (schemaObjectId: string) => void;
  /** Открыть годовой отчёт участка (экран SeasonReport, задача 33.1) */
  onOpenSeasonReport?: () => void;
}

// ─── Константы ───────────────────────────────────────────────────────

/** Размеры участка по умолчанию, если boundary не задан */
const DEFAULT_PLOT_WIDTH_M = 20;
const DEFAULT_PLOT_HEIGHT_M = 30;
/** Масштаб по умолчанию: пикселей на метр (1:100) */
const DEFAULT_SCALE = 20;
/** Отступ участка от краёв Stage при центрировании */
const PLOT_PADDING = 28;

// ─── Загрузка data-URI паттернов как HTMLImageElement ────────────────

const PATTERN_URIS: Record<string, string> = {
  grid: gridPattern,
  grid5: gridPattern5,
  grass: grassPattern,
  gravel: gravelPattern,
  flower: flowerPattern,
  building: buildingPattern,
};

/**
 * Загружает все data-URI паттерны в HTMLImageElement.
 * Возвращает пустой объект до завершения загрузки — Konva обновится при готовности.
 */
function usePatternImages(): Record<string, HTMLImageElement> {
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    let cancelled = false;
    const loaded: Record<string, HTMLImageElement> = {};
    const keys = Object.keys(PATTERN_URIS);
    let remaining = keys.length;

    const flush = () => {
      if (!cancelled) setImages({ ...loaded });
    };

    keys.forEach((key) => {
      const img = new Image();
      img.onload = () => {
        loaded[key] = img;
        remaining -= 1;
        if (remaining === 0) flush();
      };
      img.onerror = () => {
        remaining -= 1;
        if (remaining === 0) flush();
      };
      img.src = PATTERN_URIS[key];
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return images;
}

// ─── Компонент ───────────────────────────────────────────────────────

export function GardenDetail({ gardenId, gardenName, onBack, onOpenPlanting, onOpenPlaceHistory, onOpenSeasonReport }: GardenDetailProps) {
  // ─── Данные из PocketBase (задача C.3) ─────────────────────────────
  const [garden, setGarden] = useState<Garden | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    setGarden(undefined);
    gardensApi
      .getOne(gardenId)
      .then((g) => {
        if (!cancelled) setGarden(g);
      })
      .catch(() => {
        if (!cancelled) setGarden(null);
      });
    return () => {
      cancelled = true;
    };
  }, [gardenId]);

  const { data: objectDocs } = usePbCollection(schemaObjectsApi, `gardenId="${gardenId}"`);

  const objects: SchemaObjectData[] = useMemo(
    () =>
      (objectDocs ?? []).map((doc) => ({
        id: doc.id,
        type: doc.type,
        label: doc.label,
        geometry: { type: doc.geometry.type, points: doc.geometry.points },
      })),
    [objectDocs],
  );

  // Размеры листа — из boundary (bounding box), масштаб — из canvasConfig
  const { plotWidthM, plotHeightM } = useMemo(() => {
    const pts = garden?.boundary?.points;
    if (!pts || pts.length < 3) {
      return {
        plotWidthM: DEFAULT_PLOT_WIDTH_M,
        plotHeightM: DEFAULT_PLOT_HEIGHT_M,
      };
    }
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return {
      plotWidthM: Math.max(...xs) - Math.min(...xs) || DEFAULT_PLOT_WIDTH_M,
      plotHeightM: Math.max(...ys) - Math.min(...ys) || DEFAULT_PLOT_HEIGHT_M,
    };
  }, [garden]);

  const baseScale = garden?.canvasConfig?.scale ?? DEFAULT_SCALE;

  // ─── Время суток / небо (§6) ──────────────────────────────────────
  const timeOfDay = getTimeOfDay();
  const skyGradient = getSkyGradient(timeOfDay);
  const night = isNightMode(timeOfDay);
  const headerTextColor = night ? 'text-white' : 'text-ink';

  // ─── Размеры контейнера канвы ─────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setCanvasSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── Масштаб: вписываем участок, не более 1:100 ───────────────────
  const scale = useMemo(() => {
    const fitX = (canvasSize.width - PLOT_PADDING * 2) / plotWidthM;
    const fitY = (canvasSize.height - PLOT_PADDING * 2) / plotHeightM;
    const fit = Math.max(2, Math.min(fitX, fitY));
    return Math.min(baseScale, fit);
  }, [canvasSize.width, canvasSize.height, plotWidthM, plotHeightM, baseScale]);

  // Центрируем лист в канве
  const plotWPx = plotWidthM * scale;
  const plotHPx = plotHeightM * scale;
  const offsetX = Math.max(0, (canvasSize.width - plotWPx) / 2);
  const offsetY = Math.max(0, (canvasSize.height - plotHPx) / 2);

  // Конвертеры метров → пиксели
  const mx = useCallback((m: number) => m * scale + offsetX, [scale, offsetX]);
  const my = useCallback((m: number) => m * scale + offsetY, [scale, offsetY]);

  // ─── Режим редактора (задача 3.2) ─────────────────────────────────
  const [editorMode, setEditorMode] = useState<EditorMode>('view');
  const [selectedType, setSelectedType] = useState('flowerbed');

  // ─── Pan/zoom Stage (задача 3.1) ──────────────────────────────────
  // В режимах рисования pan/zoom выключен — тапы уходят в рисование
  const { stageProps, zoom, focusOn } = usePanZoom({
    minZoom: 0.5,
    maxZoom: 8,
    enabled: editorMode === 'view',
  });

  // ─── Выделение и перемещение объектов (задача 3.4) ────────────────
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const handleObjectMove = useCallback(
    async (obj: SchemaObjectData, dxM: number, dyM: number) => {
      const points = obj.geometry.points.map(([x, y]) => [
        Math.round((x + dxM) * 100) / 100,
        Math.round((y + dyM) * 100) / 100,
      ]);
      try {
        await schemaObjectsApi.update(obj.id, {
          geometry: { type: obj.geometry.type, points },
        });
      } catch {
        // Конва уже сброшена в исходное положение — объект просто вернётся
      }
    },
    [],
  );

  // Тап по пустому месту листа — снять выделение
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === e.target.getStage()) setSelectedObjectId(null);
    },
    [],
  );

  // ─── Активные посадки: маркеры и список места (задача 4.3) ────────
  // PocketBase не шлёт realtime-события с вложенными данными растения —
  // подписываемся на изменения plantings и перечитываем getActive() целиком
  // (аналог реактивности convex useQuery, см. usePbCollection).
  const [activePlantings, setActivePlantings] = useState<PlantingWithPlant[] | undefined>(undefined);
  const refetchActivePlantings = useCallback(async () => {
    setActivePlantings(await getActive(gardenId));
  }, [gardenId]);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    void refetchActivePlantings();
    void plantingsApi
      .subscribe('*', () => {
        if (!cancelled) void refetchActivePlantings();
      })
      .then((fn) => {
        if (cancelled) fn();
        else unsub = fn;
      });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [refetchActivePlantings]);

  const [plantingListObjectId, setPlantingListObjectId] = useState<string | null>(null);

  const plantingsOfSelectedPlace = useMemo(
    () =>
      (activePlantings ?? []).filter(
        (p) => p.schemaObjectId === plantingListObjectId,
      ),
    [activePlantings, plantingListObjectId],
  );

  // ─── Зоны условий (задача 3.6) ────────────────────────────────────
  const zoneFilter = `gardenId="${gardenId}"`;
  const { data: lightZonesData } = usePbCollection(lightZonesApi, zoneFilter);
  const { data: moistureZonesData } = usePbCollection(moistureZonesApi, zoneFilter);
  const [zoneLayer, setZoneLayer] = useState<ZoneLayerKind | null>(null);

  const visibleZones = useMemo(() => {
    if (!zoneLayer) return [];
    const docs = zoneLayer === 'light' ? lightZonesData : moistureZonesData;
    if (!docs) return [];
    return docs.map((z) => ({
      id: z.id,
      condition: z.condition,
      geometry: z.geometry,
    }));
  }, [zoneLayer, lightZonesData, moistureZonesData]);

  // ─── Рисование и удаление зон (задача 3.7) ────────────────────────
  const zoneApiFor = (layer: ZoneLayerKind) => (layer === 'light' ? lightZonesApi : moistureZonesApi);
  const [zoneCondition, setZoneCondition] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState('');
  const [deleteZoneId, setDeleteZoneId] = useState<string | null>(null);
  const [zoneBusy, setZoneBusy] = useState(false);

  // ─── Рисование объектов (задача 3.3) ──────────────────────────────
  const [drawError, setDrawError] = useState('');

  // Позиция на Stage (после трансформа) → метры листа
  const toMeters = useCallback(
    (p: { x: number; y: number }) => ({
      x: (p.x - offsetX) / scale,
      y: (p.y - offsetY) / scale,
    }),
    [offsetX, offsetY, scale],
  );

  const drawKind = objectTypeInfo(selectedType).geometry;

  const draw = useDrawObject({
    active: editorMode === 'addObject',
    kind: drawKind,
    toMeters,
    onCommit: async (geometry) => {
      setDrawError('');
      try {
        await schemaObjectsApi.create({
          gardenId,
          type: selectedType as SchemaObject['type'],
          geometry: { type: geometry.type, points: geometry.points },
        });
      } catch {
        setDrawError('Не получилось сохранить объект. Попробуйте ещё раз.');
        throw new Error('save failed');
      }
    },
  });

  const drawZone = useDrawZone({
    active: editorMode === 'zones' && zoneLayer !== null && zoneCondition !== null,
    toMeters,
    onCommit: async (points) => {
      if (!zoneLayer || !zoneCondition) return;
      setZoneError('');
      try {
        await zoneApiFor(zoneLayer).create({
          gardenId,
          condition: zoneCondition as never,
          geometry: { points },
        });
      } catch {
        setZoneError('Не получилось сохранить зону. Попробуйте ещё раз.');
        throw new Error('save failed');
      }
    },
  });

  const handleZoneRemove = async () => {
    if (!deleteZoneId || !zoneLayer) return;
    setZoneBusy(true);
    try {
      await zoneApiFor(zoneLayer).remove(deleteZoneId);
    } catch {
      setZoneError('Не получилось удалить зону. Попробуйте ещё раз.');
    } finally {
      setZoneBusy(false);
      setDeleteZoneId(null);
    }
  };

  // ─── Паттерны ─────────────────────────────────────────────────────
  const patternImages = usePatternImages();

  // ─── Экспликация / номера (§3.4) ──────────────────────────────────
  const { items, groupMap } = useExplicationData(objects);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  // Объекты с пиксельными координатами для ObjectNumbers
  const objectsForNumbers: SchemaObjectForNumber[] = useMemo(
    () =>
      objects.map((o) => ({
        id: o.id,
        type: o.type,
        label: o.label,
        geometry: {
          type: o.geometry.type,
          points: o.geometry.points.map(([x, y]) => [mx(x), my(y)] as number[]),
        },
      })),
    [objects, mx, my],
  );

  // Проверка принадлежности объекта к выделенной группе
  const isObjectSelected = useCallback(
    (obj: SchemaObjectData) => {
      if (selectedNumber == null) return false;
      return groupMap.get(groupKey(obj)) === selectedNumber;
    },
    [selectedNumber, groupMap],
  );

  // ─── Командная палитра Cmd+K (задача H.1) ─────────────────────────
  // Пиксельные координаты объектов (objectsForNumbers) — в той же системе,
  // в которой pan/zoom Stage применяет свой трансформ, поэтому centroid для
  // focusOn берём именно оттуда.
  const searchItems: CanvasSearchItem[] = useMemo(
    () =>
      objects.map((o, i) => ({
        id: o.id,
        label: o.label?.trim() || typeToRussian(o.type),
        typeName: typeToRussian(o.type),
        number: groupMap.get(groupKey(o)),
        centroid: centroidOf(objectsForNumbers[i].geometry.points),
      })),
    [objects, objectsForNumbers, groupMap],
  );

  const handlePaletteSelect = useCallback(
    (item: CanvasSearchItem) => {
      if (item.number != null) setSelectedNumber(item.number);
      if (canvasSize.width > 0 && canvasSize.height > 0) {
        focusOn(item.centroid, canvasSize);
      }
    },
    [focusOn, canvasSize],
  );

  // Освещённость выбранного объекта — светозоны, в которые попадает его центр
  // (задача H.2). Считаем в координатах модели независимо от активного слоя зон.
  const selectedLightConditions: LightCondition[] = useMemo(() => {
    if (!selectedObjectId) return [];
    const obj = objects.find((o) => o.id === selectedObjectId);
    if (!obj) return [];
    const c = centroidOf(obj.geometry.points);
    return (lightZonesData ?? [])
      .filter((z) => pointInPolygon(c, z.geometry.points))
      .map((z) => z.condition);
  }, [selectedObjectId, objects, lightZonesData]);

  // ─── Производные рендера ──────────────────────────────────────────
  const showAttributes = scale * zoom >= 10;

  if (garden === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4">
        <p className="mb-4 font-poster text-[21px] font-semibold uppercase text-ink">
          Участок не найден
        </p>
        <button
          type="button"
          onClick={onBack}
          className="font-mono text-[17px] text-blueink underline underline-offset-4"
        >
          ← К списку участков
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] flex-col bg-surface">
      {/* ═══ Шапка (§6) ═══ */}
      <header
        className="relative h-[72px] shrink-0"
        style={{ background: skyGradient }}
      >
        {/* Плашка-бланк: paper + двойная рамка + тень */}
        <div
          className={[
            'absolute inset-2 flex items-center gap-3 px-4',
            'border-2 border-ink bg-paper shadow-blank',
            'outline-1 outline-ink outline-offset-[-5px]',
          ].join(' ')}
        >
          {/* Кнопка «Назад» */}
          <button
            type="button"
            onClick={onBack}
            className={`shrink-0 cursor-pointer ${headerTextColor}`}
            aria-label="Назад"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* H2: font-poster 21/600 КАПС */}
          <h2
            className={[
              'truncate font-poster text-[21px] font-semibold uppercase tracking-[0.04em]',
              headerTextColor,
            ].join(' ')}
          >
            {gardenName}
          </h2>

          {/* Годовой отчёт (задача 33.1) */}
          {onOpenSeasonReport && (
            <button
              type="button"
              onClick={onOpenSeasonReport}
              className={`ml-auto shrink-0 cursor-pointer ${headerTextColor}`}
              aria-label="Годовой отчёт"
              title="Годовой отчёт"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 15l4-4 3 3 5-6" />
              </svg>
            </button>
          )}

          {/* Экспорт схемы в PNG (задача 31.1) */}
          <ExportPng
            stageRef={stageRef}
            gardenName={gardenName}
            className={`shrink-0 cursor-pointer ${headerTextColor}`}
          />
        </div>
      </header>

      {/* ═══ Канва (§3.1, §3.2) — ленивый чанк (задача 17.3) ═══ */}
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        {/* Поиск объектов по схеме с подсветкой (задача 34.4) */}
        {editorMode === 'view' && (
          <div className="absolute left-3 top-3 z-20">
            <SearchOnCanvas
              items={items}
              selectedNumber={selectedNumber}
              onHighlight={setSelectedNumber}
            />
          </div>
        )}

        {/* Командная палитра Cmd+K + FAB (задача H.1) */}
        {editorMode === 'view' && (
          <CommandPalette items={searchItems} onSelect={handlePaletteSelect} />
        )}

        {canvasSize.width > 0 && canvasSize.height > 0 && (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center font-mono text-ink-muted">
                Загрузка канвы…
              </div>
            }
          >
            <GardenCanvasStage
              ref={stageRef}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
              stageProps={stageProps}
              editorMode={editorMode}
              draw={draw}
              drawZone={drawZone}
              drawKind={drawKind}
              handleStageClick={handleStageClick}
              patternImages={patternImages}
              offsetX={offsetX}
              offsetY={offsetY}
              plotWPx={plotWPx}
              plotHPx={plotHPx}
              scale={scale}
              objects={objects}
              mx={mx}
              my={my}
              isObjectSelected={isObjectSelected}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
              handleObjectMove={(obj, dxM, dyM) => void handleObjectMove(obj, dxM, dyM)}
              zoneLayer={zoneLayer}
              visibleZones={visibleZones}
              deleteZoneId={deleteZoneId}
              onZoneTap={
                editorMode === 'zones' && zoneCondition === null
                  ? (id) => setDeleteZoneId(id)
                  : undefined
              }
              objectsForNumbers={objectsForNumbers}
              groupMap={groupMap}
              selectedNumber={selectedNumber}
              activePlantings={(activePlantings ?? []).map((p) => ({ _id: p.id, schemaObjectId: p.schemaObjectId }))}
              onPlantingMarkerTap={(objectId) => setPlantingListObjectId(objectId)}
              showAttributes={showAttributes}
            />
          </Suspense>
        )}
      </div>

      {/* ═══ Управление рисованием (задача 3.3) ═══ */}
      {editorMode === 'addObject' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[130px] z-10 flex flex-col items-center gap-2 px-4">
          {drawError && (
            <p className="pointer-events-auto rounded-[8px] border-2 border-red bg-paper px-3 py-1 font-mono text-[14px] text-red">
              {drawError}
            </p>
          )}
          {draw.draftPoints.length > 0 && (
            <div className="pointer-events-auto flex gap-2">
              {draw.canFinish && (
                <button
                  type="button"
                  onClick={draw.finish}
                  disabled={draw.saving}
                  className="rounded-[8px] border-2 border-ink bg-ink px-4 py-2 font-poster text-[15px] font-semibold uppercase text-paper"
                >
                  {draw.saving ? 'Сохраняем…' : 'Готово'}
                </button>
              )}
              <button
                type="button"
                onClick={draw.cancel}
                disabled={draw.saving}
                className="rounded-[8px] border-2 border-ink bg-paper px-4 py-2 font-poster text-[15px] font-semibold uppercase text-ink"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ Переключатель слоя зон (задача 3.6) + рисование (задача 3.7) ═══ */}
      {editorMode === 'zones' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[130px] z-10 flex flex-col items-center gap-2 px-4">
          {zoneError && (
            <p className="pointer-events-auto rounded-[8px] border-2 border-red bg-paper px-3 py-1 font-mono text-[14px] text-red">
              {zoneError}
            </p>
          )}
          {zoneLayer && (
            <div className="pointer-events-auto flex gap-1 rounded-[8px] border-2 border-ink bg-paper p-1">
              {ZONE_CONDITIONS[zoneLayer].map((c) => (
                <button
                  key={c.condition}
                  type="button"
                  onClick={() =>
                    setZoneCondition(
                      zoneCondition === c.condition ? null : c.condition,
                    )
                  }
                  className={[
                    'rounded-[6px] px-3 py-1.5 font-poster text-[14px] font-semibold uppercase',
                    zoneCondition === c.condition
                      ? 'bg-ink text-paper'
                      : 'text-ink hover:bg-ink/10',
                  ].join(' ')}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
          {zoneLayer && (
            <p className="pointer-events-none font-mono text-[12px] text-ink-muted">
              {zoneCondition
                ? 'Тапайте по листу — рисуйте зону'
                : 'Выберите условие, чтобы рисовать; тап по зоне — удалить'}
            </p>
          )}
          {drawZone.draftPoints.length > 0 && (
            <div className="pointer-events-auto flex gap-2">
              {drawZone.canFinish && (
                <button
                  type="button"
                  onClick={drawZone.finish}
                  disabled={drawZone.saving}
                  className="rounded-[8px] border-2 border-ink bg-ink px-4 py-2 font-poster text-[15px] font-semibold uppercase text-paper"
                >
                  {drawZone.saving ? 'Сохраняем…' : 'Готово'}
                </button>
              )}
              <button
                type="button"
                onClick={drawZone.cancel}
                disabled={drawZone.saving}
                className="rounded-[8px] border-2 border-ink bg-paper px-4 py-2 font-poster text-[15px] font-semibold uppercase text-ink"
              >
                Отмена
              </button>
            </div>
          )}
          <div className="pointer-events-auto flex gap-1 rounded-[8px] border-2 border-ink bg-paper p-1">
            {(
              [
                { value: 'light' as const, label: 'Свет' },
                { value: 'moisture' as const, label: 'Влага' },
                { value: null, label: 'Выкл' },
              ] as { value: ZoneLayerKind | null; label: string }[]
            ).map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  setZoneLayer(opt.value);
                  setZoneCondition(null);
                }}
                className={[
                  'rounded-[6px] px-3 py-1.5 font-poster text-[14px] font-semibold uppercase',
                  zoneLayer === opt.value
                    ? 'bg-ink text-paper'
                    : 'text-ink hover:bg-ink/10',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Подтверждение удаления зоны (задача 3.7) ═══ */}
      <Modal
        open={deleteZoneId !== null}
        title="Удалить зону?"
        confirmVariant="danger"
        confirmText={zoneBusy ? 'Удаляем…' : 'Удалить'}
        cancelText="Отмена"
        onConfirm={() => void handleZoneRemove()}
        onCancel={() => setDeleteZoneId(null)}
      >
        {(() => {
          const zone = visibleZones.find((z) => z.id === deleteZoneId);
          return zone
            ? `Зона «${zoneConditionLabel(zone.condition)}» будет удалена со схемы.`
            : 'Зона будет удалена со схемы.';
        })()}
      </Modal>

      {/* ═══ Список посадок места (задача 4.3) ═══ */}
      {plantingListObjectId && (
        <div className="absolute inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper p-4 shadow-blank">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-poster text-[17px] font-semibold uppercase text-ink">
                Посадки этого места
              </span>
              <button
                type="button"
                onClick={() => setPlantingListObjectId(null)}
                aria-label="Закрыть"
                className="rounded-lg p-2 text-ink transition-colors hover:bg-ink/10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto">
              {plantingsOfSelectedPlace.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpenPlanting?.(p.id)}
                  className="flex items-baseline justify-between rounded-[8px] border-2 border-ink bg-surface px-3 py-3 text-left shadow-blank"
                >
                  <span className="text-[16px] text-ink">
                    {p.plant ? p.plant.name : 'Растение'}
                    {p.plant?.variety ? ` «${p.plant.variety}»` : ''}
                    {p.quantity ? ` × ${p.quantity}` : ''}
                  </span>
                  <span className="font-mono text-[13px] text-blueink">
                    {formatRuDate(new Date(p.plantedAt).getTime())}
                  </span>
                </button>
              ))}
              {plantingsOfSelectedPlace.length === 0 && (
                <p className="py-4 text-center font-mono text-[14px] text-ink-muted">
                  Активных посадок нет
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Sheet свойств выбранного объекта (задача 3.5) ═══ */}
      <ObjectSheet
        object={
          selectedObjectId
            ? (objects.find((o) => o.id === selectedObjectId) ?? null)
            : null
        }
        gardenId={gardenId}
        onClose={() => setSelectedObjectId(null)}
        onOpenPlaceHistory={onOpenPlaceHistory}
        lightConditions={selectedLightConditions}
      />

      {/* ═══ Панель инструментов редактора (задача 3.2) ═══ */}
      <EditorToolbar
        mode={editorMode}
        onModeChange={setEditorMode}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
      />

      {/* ═══ Экспликация (§6, §3.4) ═══ */}
      <Explication
        items={items}
        onSelect={(n) => setSelectedNumber(n)}
        className="shrink-0"
      />
    </div>
  );
}

export default GardenDetail;
