interface GardenDetailProps {
  gardenName: string;
  onBack: () => void;
}

export function GardenDetail({ gardenName, onBack }: GardenDetailProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4">
        <button
          onClick={onBack}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Назад"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">{gardenName}</h1>
      </header>

      <main className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="mb-4 text-6xl">🌱</div>
          <p className="text-lg font-medium text-gray-600">
            Здесь будет схема участка
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Редактор схемы появится на следующем этапе
          </p>
        </div>
      </main>
    </div>
  );
}