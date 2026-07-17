import { useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";

// TODO: заменить на реальные Convex queries/mutations
interface Garden {
  _id: string;
  name: string;
  boundary?: { points: number[][] };
}

interface GardensProps {
  onSelectGarden: (gardenId: string, gardenName: string) => void;
}

const STORAGE_KEY = "udachny-sad-gardens";

// Fallback UUID для не-secure контекста (HTTP не на localhost)
function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // fallthrough
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadGardens(): Garden[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function Gardens({ onSelectGarden }: GardensProps) {
  const [gardens, setGardens] = useState<Garden[]>(loadGardens);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [error, setError] = useState("");

  const handleCreate = () => {
    const w = parseFloat(width);
    const l = parseFloat(length);
    if (!name.trim()) return setError("Введите название участка");
    if (!w || w <= 0) return setError("Введите ширину в метрах");
    if (!l || l <= 0) return setError("Введите длину в метрах");
    setError("");

    const newGarden: Garden = {
      _id: uuid(),
      name: name.trim(),
      boundary: {
        points: [[0, 0], [w, 0], [w, l], [0, l]],
      },
    };
    const updated = [...gardens, newGarden];
    setGardens(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    setShowCreate(false);
    setName("");
    setWidth("");
    setLength("");
  };

  const handleDelete = () => {
    const updated = gardens.filter((g) => g._id !== deleteTarget);
    setGardens(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b-2 border-ink bg-paper px-4 py-4">
        <h1
          className="font-poster text-[30px] uppercase tracking-[0.03em] text-ink"
          style={{ fontWeight: 700 }}
        >
          Мои участки
        </h1>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {gardens.length === 0 ? (
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
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {gardens.map((g) => (
              <div
                key={g._id}
                className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank"
              >
                <div className="flex items-center justify-between rounded-[6px] border border-ink p-4">
                  <button
                    onClick={() => onSelectGarden(g._id, g.name)}
                    className="flex-1 text-left"
                  >
                    <div className="font-poster text-[17px] text-ink">
                      {g.name}
                    </div>
                    {g.boundary && (
                      <div className="font-mono text-[15px] text-blueink">
                        {g.boundary.points[1]?.[0]} × {g.boundary.points[2]?.[1]} м
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(g._id)}
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
      </main>

      {/* Модалка создания */}
      <Modal
        open={showCreate}
        title="Новый участок"
        confirmText="Создать"
        cancelText="Отмена"
        onConfirm={handleCreate}
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
        confirmText="Списать"
        cancelText="Отмена"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        Записи в журнале сохранятся.
      </Modal>
    </div>
  );
}
