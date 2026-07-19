/**
 * StampOverlay — полноэкранный оверлей с печатью-подтверждением после мутаций.
 *
 * Показывает Stamp по центру экрана поверх полупрозрачной маски,
 * автоматически скрывается через 1.4с или по тапу.
 *
 * Использование:
 *   const [stamp, setStamp] = useState<string | null>(null);
 *   ... после мутации: setStamp('ПОСАЖЕНО');
 *   <StampOverlay action={stamp} onClose={() => setStamp(null)} />
 *
 * DESIGN.md v5.1 §6 — печать «ударом» (scale 1.2 → 1) + лёгкое затемнение фона.
 */

import { useEffect } from 'react';
import { Stamp } from './Stamp';

interface StampOverlayProps {
  /** Текст действия в центре печати. null = скрыть. */
  action: string | null;
  /** Callback при закрытии (по таймауту или тапу). */
  onClose: () => void;
  /** Длительность показа в мс (по умолчанию 1400). */
  durationMs?: number;
}

export function StampOverlay({ action, onClose, durationMs = 1400 }: StampOverlayProps) {
  useEffect(() => {
    if (!action) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(onClose, reduceMotion ? 900 : durationMs);
    return () => clearTimeout(t);
  }, [action, durationMs, onClose]);

  if (!action) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(247, 239, 217, 0.7)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        animation: 'stamp-fade-in 200ms ease-out',
      }}
      role="status"
      aria-live="polite"
      aria-label={`Печать: ${action}`}
    >
      <Stamp action={action} />
      <style>{`
        @keyframes stamp-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .stamp-overlay { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default StampOverlay;
