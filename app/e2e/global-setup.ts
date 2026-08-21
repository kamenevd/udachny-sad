/**
 * Глобальный setup e2e (PLAN13): реальный локальный PocketBase вместо
 * Convex-моков, которые приложение перестало импортировать после PLAN7 —
 * e2e с тех пор молча ходили на боевой сервер и работали только из
 * домашней сети автора.
 *
 * Что делает:
 *  1. Стартует PocketBase на 127.0.0.1:8092 со СВЕЖЕЙ базой
 *     (.pb-e2e-data, пересоздаётся) и миграциями из ../pb_migrations.
 *  2. Сидит данные:
 *     - dachnik@example.com / secret-123 — пустой аккаунт (auth и CRUD
 *       участков; сами тесты создают уникальных пользователей, где нужна
 *       изоляция);
 *     - sadovod@example.com / secret-123 — «Тестовый участок» 20×30 с
 *       клумбой, посадкой «Клубника „Виктория“» и записью журнала
 *       (навигационные сценарии, только чтение).
 *
 * Бинарник ищется по $POCKETBASE_BIN, затем в PATH, затем ../pocketbase.
 * Скачать: https://pocketbase.io/docs/ (нужен ≥0.23; проверялось на 0.29).
 */

import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const E2E_DIR = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(E2E_DIR, "..");
const REPO_DIR = resolve(APP_DIR, "..");
const DATA_DIR = join(APP_DIR, ".pb-e2e-data");
const MIGRATIONS_DIR = join(REPO_DIR, "pb_migrations");
const PID_FILE = join(DATA_DIR, "pb.pid");

export const PB_E2E_URL = "http://127.0.0.1:8092";

const ADMIN_EMAIL = "e2e-admin@test.local";
const ADMIN_PASSWORD = "e2e-admin-password";

function findPocketBase(): string {
  const candidates = [
    process.env.POCKETBASE_BIN,
    join(REPO_DIR, "pocketbase"),
    "/tmp/pb/pocketbase",
    "pocketbase", // PATH
  ].filter((c): c is string => !!c);
  for (const bin of candidates) {
    try {
      execFileSync(bin, ["--version"], { stdio: "pipe" });
      return bin;
    } catch {
      /* следующий кандидат */
    }
  }
  throw new Error(
    "PocketBase не найден. Укажите путь в $POCKETBASE_BIN или положите " +
      "бинарник в корень репозитория (https://pocketbase.io/docs/).",
  );
}

async function api(
  path: string,
  body?: unknown,
  token?: string,
  method?: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(PB_E2E_URL + path, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`PocketBase ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function waitForHealth(timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${PB_E2E_URL}/api/health`);
      if (res.ok) return;
    } catch {
      /* ещё не поднялся */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("PocketBase для e2e не поднялся за 15 секунд");
}

async function seed(): Promise<void> {
  const { token } = (await api("/api/collections/_superusers/auth-with-password", {
    identity: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })) as { token: string };

  // PocketBase 0.23+ включает rate limiter по умолчанию — параллельные
  // e2e-воркеры с одного IP ловят 429 и видят экран «Не получилось
  // загрузить». Для тестового инстанса лимиты выключаем.
  await api("/api/settings", { rateLimits: { enabled: false } }, token, "PATCH");

  const createUser = async (email: string) =>
    api(
      "/api/collections/users/records",
      { email, password: "secret-123", passwordConfirm: "secret-123", emailVisibility: true },
      token,
    );

  // Пустой аккаунт для auth-тестов
  await createUser("dachnik@example.com");

  // Аккаунт с данными для навигационных тестов
  const sadovod = await createUser("sadovod@example.com");
  const garden = await api(
    "/api/collections/gardens/records",
    {
      ownerId: sadovod.id,
      name: "Тестовый участок",
      boundary: { points: [[0, 0], [20, 0], [20, 30], [0, 30]] },
    },
    token,
  );
  const bed = await api(
    "/api/collections/schemaObjects/records",
    {
      gardenId: garden.id,
      type: "flowerbed",
      label: "Клумба у дома",
      geometry: { type: "polygon", points: [[2, 2], [18, 2], [18, 28], [2, 28]] },
    },
    token,
  );
  const strawberry = await api(
    "/api/collections/plants/records",
    {
      userId: sadovod.id,
      plantType: "perennial",
      name: "Клубника",
      variety: "Виктория",
    },
    token,
  );
  const planting = await api(
    "/api/collections/plantings/records",
    {
      gardenId: garden.id,
      plantId: strawberry.id,
      schemaObjectId: bed.id,
      plantedAt: "2026-05-10 09:00:00.000Z",
      status: "active",
      quantity: 12,
    },
    token,
  );
  await api(
    "/api/collections/journalEvents/records",
    {
      plantingId: planting.id,
      eventType: "planting",
      eventDate: "2026-05-10 09:00:00.000Z",
      title: "Высадили рассаду",
    },
    token,
  );
}

export default async function globalSetup(): Promise<void> {
  const bin = findPocketBase();

  rmSync(DATA_DIR, { recursive: true, force: true });
  mkdirSync(DATA_DIR, { recursive: true });

  execFileSync(
    bin,
    ["superuser", "upsert", ADMIN_EMAIL, ADMIN_PASSWORD,
      `--dir=${DATA_DIR}`, `--migrationsDir=${MIGRATIONS_DIR}`],
    { stdio: "pipe" },
  );

  const child = spawn(
    bin,
    ["serve", "--http=127.0.0.1:8092", `--dir=${DATA_DIR}`, `--migrationsDir=${MIGRATIONS_DIR}`],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
  if (!child.pid) throw new Error("Не удалось запустить PocketBase для e2e");
  writeFileSync(PID_FILE, String(child.pid));

  await waitForHealth();
  await seed();
}
