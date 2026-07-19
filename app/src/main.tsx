import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { pb } from "./lib/pb";
import "./index.css";
import "./theme/highContrast.css";
import { initHighContrast } from "./hooks/useHighContrast";
import { lazy, Suspense } from "react";
import { Login } from "./screens/Login";
import { YandexCallback } from "./screens/YandexCallback";
import { YANDEX_CALLBACK_PATH } from "./lib/auth";
const Gardens = lazy(() => import("./screens/Gardens").then(m => ({ default: m.Gardens })));
const GardenDetail = lazy(() => import("./screens/GardenDetail").then(m => ({ default: m.GardenDetail })));
const Plants = lazy(() => import("./screens/Plants").then(m => ({ default: m.Plants })));
const PlantingDetail = lazy(() => import("./screens/PlantingDetail").then(m => ({ default: m.PlantingDetail })));
const PlaceHistory = lazy(() => import("./screens/PlaceHistory").then(m => ({ default: m.PlaceHistory })));
const SeasonReport = lazy(() => import("./screens/SeasonReport").then(m => ({ default: m.SeasonReport })));
const Dashboard = lazy(() => import("./screens/Dashboard").then(m => ({ default: m.Dashboard })));

function ScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="animate-pulse text-[40px]">🌱</div>
    </div>
  );
}
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import { InstallPrompt } from "./components/InstallPrompt";

/**
 * Роутер MVP — state-машина экранов (без URL-роутинга).
 * Авторизация — PocketBase (`pb.authStore`): гейт слушает `onChange` и
 * переключает Login ↔ приложение. Все id — строки PocketBase.
 */

type Screen =
  | { name: "gardens" }
  | { name: "plants" }
  | { name: "dashboard" }
  | { name: "gardenDetail"; gardenId: string; gardenName: string }
  | {
      name: "plantingDetail";
      plantingId: string;
      gardenId: string;
      gardenName: string;
    }
  | {
      name: "placeHistory";
      schemaObjectId: string;
      gardenId: string;
      gardenName: string;
    }
  | {
      name: "seasonReport";
      gardenId: string;
      gardenName: string;
    };

/**
 * Начальный экран из deep link manifest-shortcuts (задача 27.3),
 * например ?screen=plants из «Справочник растений» в меню установленного PWA.
 * Поддерживаются только экраны без обязательных ID (gardens, plants).
 */
function screenFromDeepLink(): Screen {
  const params = new URLSearchParams(window.location.search);
  if (params.get("screen") === "plants") return { name: "plants" };
  return { name: "gardens" };
}

function AppAuthenticated() {
  const [screen, setScreen] = useState<Screen>(() => screenFromDeepLink());

  // Убираем ?screen=... из адресной строки после того, как он применён —
  // дальнейшая навигация внутри app не должна на него оглядываться.
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Scroll-to-top при смене экрана (задача 16.4)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name, (screen as any).gardenId, (screen as any).plantingId, (screen as any).schemaObjectId]);

  switch (screen.name) {
    case "gardens":
      return (
        <Gardens
          onSelectGarden={(gardenId, gardenName) =>
            setScreen({ name: "gardenDetail", gardenId, gardenName })
          }
          onOpenPlants={() => setScreen({ name: "plants" })}
          onOpenDashboard={() => setScreen({ name: "dashboard" })}
        />
      );

    case "plants":
      return <Plants onBack={() => setScreen({ name: "gardens" })} />;

    case "dashboard":
      return <Dashboard onBack={() => setScreen({ name: "gardens" })} />;

    case "gardenDetail":
      return (
        <GardenDetail
          gardenId={screen.gardenId}
          gardenName={screen.gardenName}
          onBack={() => setScreen({ name: "gardens" })}
          onOpenPlanting={(plantingId) =>
            setScreen({
              name: "plantingDetail",
              plantingId,
              gardenId: screen.gardenId,
              gardenName: screen.gardenName,
            })
          }
          onOpenPlaceHistory={(schemaObjectId) =>
            setScreen({
              name: "placeHistory",
              schemaObjectId,
              gardenId: screen.gardenId,
              gardenName: screen.gardenName,
            })
          }
          onOpenSeasonReport={() =>
            setScreen({
              name: "seasonReport",
              gardenId: screen.gardenId,
              gardenName: screen.gardenName,
            })
          }
        />
      );

    case "plantingDetail":
      return (
        <PlantingDetail
          plantingId={screen.plantingId}
          onBack={() =>
            setScreen({
              name: "gardenDetail",
              gardenId: screen.gardenId,
              gardenName: screen.gardenName,
            })
          }
          onNavigate={(plantingId) =>
            setScreen({
              name: "plantingDetail",
              plantingId,
              gardenId: screen.gardenId,
              gardenName: screen.gardenName,
            })
          }
        />
      );

    case "placeHistory":
      return (
        <PlaceHistory
          schemaObjectId={screen.schemaObjectId}
          onBack={() =>
            setScreen({
              name: "gardenDetail",
              gardenId: screen.gardenId,
              gardenName: screen.gardenName,
            })
          }
        />
      );

    case "seasonReport":
      return (
        <SeasonReport
          gardenId={screen.gardenId}
          gardenName={screen.gardenName}
          onBack={() =>
            setScreen({
              name: "gardenDetail",
              gardenId: screen.gardenId,
              gardenName: screen.gardenName,
            })
          }
        />
      );

    default:
      return null;
  }
}

/** Реактивная авторизация PocketBase: следим за authStore. */
function useIsAuthenticated(): boolean {
  const [authed, setAuthed] = useState(() => pb.authStore.isValid);
  useEffect(() => {
    // onChange возвращает функцию отписки.
    return pb.authStore.onChange(() => setAuthed(pb.authStore.isValid));
  }, []);
  return authed;
}

function Root() {
  const authed = useIsAuthenticated();

  if (!authed) return <Login />;

  return (
    <>
      <Suspense fallback={<ScreenLoader />}>
        <AppAuthenticated />
      </Suspense>
      <InstallPrompt />
    </>
  );
}

// Задача G.1 — применяем сохранённый режим «Солнечная вспышка» до первого рендера.
initHighContrast();

// PLAN10 B.2 — redirect-флоу Яндекс OAuth2 возвращает пользователя на
// /auth/yandex/callback; остальной app живёт без URL-роутинга (state-машина).
const isYandexCallback = window.location.pathname === YANDEX_CALLBACK_PATH;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
    <ToastProvider>
      {isYandexCallback ? <YandexCallback /> : <Root />}
    </ToastProvider>
  </ErrorBoundary>
  </StrictMode>,
);
