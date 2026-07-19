import { memo, type CSSProperties } from 'react';

export interface PlantCardProps {
  cardNumber: number;
  type?: string;
  name?: string;
  variety?: string;
  plantedAt?: string;
  status?: string;
  positionNote?: string;
  photoUrl?: string;
  className?: string;
}

/**
 * Учётная карточка растения — бланк «Садовая книжка» v5.1
 * DESIGN.md §6: поверхность surface, двойная рамка ink, тень blank,
 * шапка font-poster, значения PT Mono blueink на пунктире.
 */

interface FieldDef {
  label: string;
  value?: string;
}

const FIELD_LABELS: Record<keyof Omit<PlantCardProps, 'cardNumber' | 'photoUrl' | 'className'>, string> = {
  type: 'Тип растения',
  name: 'Название',
  variety: 'Сорт',
  plantedAt: 'Дата посадки',
  status: 'Статус',
  positionNote: 'Место на участке',
};

function PlantCardInner({
  cardNumber,
  type,
  name,
  variety,
  plantedAt,
  status,
  positionNote,
  photoUrl,
  className = '',
}: PlantCardProps) {
  const fields: FieldDef[] = [
    { label: FIELD_LABELS.type, value: type },
    { label: FIELD_LABELS.name, value: name },
    { label: FIELD_LABELS.variety, value: variety },
    { label: FIELD_LABELS.plantedAt, value: plantedAt },
    { label: FIELD_LABELS.status, value: status },
    { label: FIELD_LABELS.positionNote, value: positionNote },
  ].filter((f): f is FieldDef & { value: string } => Boolean(f.value));

  // Номер карточки — трёхзначный с ведущими нулями (042)
  const formattedNumber = String(cardNumber).padStart(3, '0');

  return (
    <div
      className={[
        'inline-block rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="rounded-[6px] border border-ink p-4">
        {/* Шапка */}
        <header className="mb-4 border-b border-ink/20 pb-3 text-center">
          <h2 className="font-poster text-[14px] uppercase tracking-[0.08em] text-ink-muted">
            Учётная карточка № {formattedNumber}
          </h2>
        </header>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* Поля */}
          {fields.length > 0 && (
            <dl className="flex flex-1 flex-col gap-3">
              {fields.map((field) => (
                <div key={field.label} className="flex flex-col gap-1">
                  <dt className="text-[13px] font-poster font-semibold uppercase tracking-[0.05em] text-ink-muted">
                    {field.label}
                  </dt>
                  <dd className="border-b border-dashed border-ink/30 pb-1 font-mono text-[15px] text-blueink">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {/* Рамка 3×4 «место для фотокарточки» */}
          <div
            className="relative shrink-0 overflow-hidden rounded-[6px] border border-dashed border-ink/30 bg-surface"
            style={{ width: 120, aspectRatio: '3 / 4' as CSSProperties['aspectRatio'] }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`Фотокарточка растения № ${formattedNumber}`}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-2 text-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                  Место для фотокарточки
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export const PlantCard = memo(PlantCardInner);


export default PlantCard;
