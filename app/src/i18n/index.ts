/**
 * Простой t() — ключ вида "section.key" → строка (задача 25.2).
 * ru-only в MVP, без библиотек и переключения языка.
 */
import { ru } from "./ru";

type Dict = typeof ru;
type SectionKey = keyof Dict;
type FlatKey = {
  [S in SectionKey]: `${S}.${Extract<keyof Dict[S], string>}`;
}[SectionKey];

export function t(key: FlatKey): string {
  const [section, field] = key.split(".") as [SectionKey, string];
  const value = (ru[section] as Record<string, string>)[field];
  return value ?? key;
}
