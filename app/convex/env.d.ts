/**
 * Минимальная декларация process.env для серверного окружения Convex
 * (без установки @types/node — в рантайме Convex process.env доступен).
 */
declare const process: {
  env: Record<string, string | undefined>;
};
