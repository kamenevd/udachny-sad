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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const hasGarden = gardens.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Мои участки</h1>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {gardens.length === 0 ? (
          <div className="mt-20 text-center">
            <div className="mb-4 text-5xl">🌱</div>
            <p className="mb-2 text-gray-600">У вас пока нет участков</p>
            <p className="mb-6 text-sm text-gray-400">
              Создайте первый участок, чтобы начать
            </p>
            <Button onClick={() => setShowCreate(true)} className="mx-auto max-w-xs">
              + Создать участок
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {gardens.map((g) => (
              <div
                key={g._id}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
              >
                <button
                  onClick={() => onSelectGarden(g._id, g.name)}
                  className="flex-1 text-left"
                >
                  <div className="font-medium text-gray-900">{g.name}</div>
                  {g.boundary && (
                    <div className="text-sm text-gray-500">
                      {g.boundary.points[1]?.[0]} × {g.boundary.points[2]?.[1]} м
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setDeleteTarget(g._id)}
                  className="ml-3 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Удалить участок"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {hasGarden && !showCreate && (
          <p className="mt-6 text-center text-xs text-gray-400">
            В MVP доступен один участок
          </p>
        )}
      </main>

      {/* Модалка создания */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Новый участок
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
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
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreate(false);
                    setError("");
                  }}
                >
                  Отмена
                </Button>
                <Button type="submit">Создать</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка удаления */}
      <Modal
        open={deleteTarget !== null}
        title="Удалить участок?"
        confirmVariant="danger"
        confirmText="Удалить"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        Участок и все связанные данные (схема, посадки, журнал, фото) будут
        удалены без возможности восстановления.
      </Modal>
    </div>
  );
}