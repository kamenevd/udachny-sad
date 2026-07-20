/**
 * EditorToolbar — панель инструментов редактора схемы (задача 3.2).
 * Режимы: просмотр / добавить объект / зоны условий.
 * В режиме добавления — выбор типа объекта (11 типов, крупные кнопки).
 *
 * Задача 16.1: адаптив — на экранах <640px кнопки компактнее.
 */

import { useMediaQuery } from '../../hooks/useMediaQuery';

export type EditorMode = 'view' | 'addObject' | 'zones';

export interface ObjectTypeInfo {
  type: string;
  label: string;
  icon: string;
  /** Геометрия, которой рисуется тип: точка одним тапом / линия / полигон */
  geometry: 'point' | 'line' | 'polygon';
}

/** 11 типов объектов схемы (ARCHITECTURE §2.1 schemaObjects.type) */
export const OBJECT_TYPES: ObjectTypeInfo[] = [
  { type: 'building', label: 'Строение', icon: '🏠', geometry: 'polygon' },
  { type: 'lawn', label: 'Газон', icon: '🌿', geometry: 'polygon' },
  { type: 'path', label: 'Дорожка', icon: '🛤️', geometry: 'line' },
  { type: 'flowerbed', label: 'Клумба', icon: '🌸', geometry: 'polygon' },
  { type: 'composition', label: 'Композиция', icon: '💐', geometry: 'polygon' },
  { type: 'hedge', label: 'Изгородь', icon: '🍃', geometry: 'line' },
  { type: 'tree', label: 'Дерево', icon: '🌳', geometry: 'point' },
  { type: 'shrub', label: 'Кустарник', icon: '🌲', geometry: 'point' },
  { type: 'water', label: 'Водоём', icon: '💧', geometry: 'polygon' },
  { type: 'gate', label: 'Калитка', icon: '🚪', geometry: 'point' },
  { type: 'other', label: 'Другое', icon: '📦', geometry: 'polygon' },
];

export function objectTypeInfo(type: string): ObjectTypeInfo {
  return (
    OBJECT_TYPES.find((t) => t.type === type) ?? {
      type,
      label: 'Другое',
      icon: '📦',
      geometry: 'polygon',
    }
  );
}

interface EditorToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  /** Открыть мастер подбора растений (PLAN12 задача 8); скрыт, если не передан */
  onOpenWizard?: () => void;
}

const MODES: { mode: EditorMode; label: string }[] = [
  { mode: 'view', label: 'Просмотр' },
  { mode: 'addObject', label: '+ Объект' },
  { mode: 'zones', label: 'Зоны' },
];

export function EditorToolbar({
  mode,
  onModeChange,
  selectedType,
  onTypeChange,
  onOpenWizard,
}: EditorToolbarProps) {
  // Адаптив: на мобильных (<640px) — компактные кнопки
  const isMobile = useMediaQuery('(max-width: 640px)');
  return (
    <div className="shrink-0 border-t-2 border-ink bg-paper">
      {/* Переключатель режимов */}
      <div className="flex gap-2 px-3 pt-2">
        {MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            onClick={() => onModeChange(m.mode)}
            className={[
              'flex-1 rounded-[8px] border-2 border-ink',
              isMobile ? 'px-1.5 py-1.5 text-[13px]' : 'px-2 py-2 text-[15px]',
              'font-poster font-semibold uppercase tracking-[0.03em]',
              'transition-colors',
              mode === m.mode
                ? 'bg-ink text-paper'
                : 'bg-surface text-ink hover:bg-ink/10',
            ].join(' ')}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Выбор типа объекта — только в режиме добавления */}
      {mode === 'addObject' && (
        <div className="flex gap-2 overflow-x-auto px-3 py-2">
          {OBJECT_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => onTypeChange(t.type)}
              className={[
                'flex shrink-0 flex-col items-center justify-center gap-1 rounded-[8px]',
                // Задача G.3 — минимум 48×48px под палец на канве.
                isMobile ? 'min-h-[48px] min-w-[60px] px-1.5 py-2' : 'min-h-[52px] min-w-[76px] px-2 py-2',
                'border-2 border-ink transition-colors',
                selectedType === t.type
                  ? 'bg-ink text-paper'
                  : 'bg-surface text-ink hover:bg-ink/10',
              ].join(' ')}
            >
              <span className={`leading-none ${isMobile ? "text-[18px]" : "text-[22px]"}`}>{t.icon}</span>
              <span className={`font-mono leading-tight ${isMobile ? "text-[11px]" : "text-[12px]"}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Мастер подбора растений (PLAN12 задача 8) */}
      {mode === 'view' && onOpenWizard && (
        <div className="px-3 py-2">
          <button
            type="button"
            onClick={onOpenWizard}
            className={[
              'flex w-full items-center justify-center gap-2 rounded-[8px] border-2 border-ink bg-surface',
              isMobile ? 'min-h-[44px] text-[13px]' : 'min-h-[48px] text-[15px]',
              'font-poster font-semibold uppercase tracking-[0.03em] text-ink',
              'transition-colors hover:bg-ink/10',
            ].join(' ')}
          >
            <span aria-hidden="true">🧭</span>
            Подобрать растения
          </button>
        </div>
      )}

      {mode === 'view' && !onOpenWizard && <div className="pb-2" />}
    </div>
  );
}
