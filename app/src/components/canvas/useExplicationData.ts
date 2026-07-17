/**
 * useExplicationData — хук-связка между schemaObjects (Convex) и компонентом Explication.
 *
 * Преобразует массив объектов сцены в пункты экспликации, группируя одинаковые
 * объекты (type + label) в один пункт с порядковым номером.
 *
 * Алгоритм группировки ИДЕНТИЧЕН алгоритму в ObjectNumbers.tsx —
 * обе сущности используют exported-функции `groupKey` и `typeToRussian`
 * из этого модуля, чтобы номера на канве и в таблице совпадали.
 *
 * Правила:
 *  - Объекты с одинаковым (type + label) → одна группа, один номер.
 *  - Объекты без label → каждый объект образует свою группу (уникальный ключ через id).
 *  - Номера присваиваются в порядке появления групп при обходе массива objects.
 */

import { useMemo } from 'react';
import type { ExplicationItem } from '../Explication';

/** Минимальный набор полей schemaObject, нужный для группировки. */
export interface SchemaObjectData {
  id: string;
  type: string;
  label?: string;
  geometry: { type: string; points: number[][] };
}

/** Результат работы хука. */
export interface UseExplicationDataResult {
  /** Пункты для компонента <Explication items={...} /> */
  items: ExplicationItem[];
  /** Ключ группы (см. groupKey) → порядковый номер (1-based). */
  groupMap: Map<string, number>;
}

/**
 * Маппинг типа объекта на русское название.
 * Используется, когда у объекта нет label, а также может применяться
 * напрямую в ObjectNumbers и Explication.
 *
 * Экспортируется отдельно — НЕ внутри хука, чтобы быть стабильной ссылкой.
 */
export function typeToRussian(type: string): string {
  switch (type) {
    case 'building':
      return 'Постройка';
    case 'greenhouse':
      return 'Теплица';
    case 'lawn':
      return 'Газон';
    case 'path':
      return 'Дорожка';
    case 'bed':
      return 'Грядка';
    case 'flowerbed':
      return 'Клумба';
    case 'tree':
      return 'Дерево';
    case 'shrub':
      return 'Кустарник';
    case 'water':
      return 'Водоём';
    case 'gate':
      return 'Калитка';
    case 'other':
      return 'Прочее';
    default:
      // Неизвестный тип — не падаем, возвращаем как есть.
      return type;
  }
}

/**
 * Детерминированный ключ группы для объекта.
 *
 * - Если label задан → `${type}|${label}` (одинаковые объекты склеиваются).
 * - Если label undefined → `${type}|#|${id}` (каждый объект уникален).
 *
 * ВАЖНО: ObjectNumbers.tsx обязан использовать ЭТУ же функцию для получения
 * ключа объекта, чтобы номера на канве совпадали с номерами в Explication.
 */
export function groupKey(obj: Pick<SchemaObjectData, 'id' | 'type' | 'label'>): string {
  return obj.label !== undefined
    ? `${obj.type}|${obj.label}`
    : `${obj.type}|#|${obj.id}`;
}

/**
 * Внутренняя структура группы в процессе обхода.
 * Map сохраняет порядок вставки → номера идут в порядке появления.
 */
interface Group {
  number: number;
  count: number;
  name: string;
}

/**
 * Хук: преобразует schemaObjects в пункты экспликации и карту номеров.
 *
 * @example
 * const { items, groupMap } = useExplicationData(schemaObjects);
 * // items → <Explication items={items} />
 * // groupMap → groupKey(obj) даст номер для рендера ObjectNumbers
 */
export function useExplicationData(objects: SchemaObjectData[]): UseExplicationDataResult {
  return useMemo(() => {
    const groupMap = new Map<string, number>();
    const groups = new Map<string, Group>();
    let nextNumber = 1;

    for (const obj of objects) {
      const key = groupKey(obj);
      const existing = groups.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        const number = nextNumber++;
        groupMap.set(key, number);
        groups.set(key, {
          number,
          count: 1,
          // label приоритетнее; иначе — тип на русском.
          name: obj.label ?? typeToRussian(obj.type),
        });
      }
    }

    // Собираем items в порядке создания групп (Map сохраняет insertion order).
    const items: ExplicationItem[] = [];
    for (const g of groups.values()) {
      items.push({
        number: g.number,
        name: g.name,
        // note только если в группе больше одного объекта.
        note: g.count > 1 ? `${g.count} шт` : undefined,
      });
    }

    return { items, groupMap };
  }, [objects]);
}

export default useExplicationData;
