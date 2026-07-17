import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Login } from "./screens/Login";
import { Gardens } from "./screens/Gardens";
import { GardenDetail } from "./screens/GardenDetail";

/**
 * Простой роутер для MVP.
 * TODO: заменить на isAuthenticated из Convex Auth + ConvexProvider.
 */

type Screen =
  | { name: "gardens" }
  | { name: "gardenDetail"; gardenId: string; gardenName: string };

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [screen, setScreen] = useState<Screen>({ name: "gardens" });

  if (!isAuthenticated) {
    return (
      <Login
        onLogin={() => {
          setIsAuthenticated(true);
          setScreen({ name: "gardens" });
        }}
      />
    );
  }

  switch (screen.name) {
    case "gardens":
      return (
        <Gardens
          onSelectGarden={(gardenId, gardenName) =>
            setScreen({ name: "gardenDetail", gardenId, gardenName })
          }
        />
      );

    case "gardenDetail":
      return (
        <GardenDetail
          gardenName={screen.gardenName}
          onBack={() => setScreen({ name: "gardens" })}
        />
      );

    default:
      return null;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);