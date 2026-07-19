/**
 * lib/ai — клиент AI-помощника поверх PocketBase (PLAN9 задача K.1).
 *
 * Заменяет прежние Convex actions `api.ai.*`. Ключ GLM (Z.AI) — секрет и
 * остаётся на сервере, поэтому запросы идут через кастомные эндпоинты
 * PocketBase (`pb_hooks`, см. серверную часть миграции), а не напрямую из
 * браузера. Паттерн повторяет `lib/auth.ts`: POST на `${pb.baseURL}/api/ai/...`
 * с токеном авторизации, разбор JSON-ответа, понятные русские ошибки для UI.
 */
import { pb } from './pb';

async function callAiEndpoint(
  path: string,
  body: Record<string, unknown>,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${pb.baseURL}/api/ai/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Не получилось связаться с AI-сервисом. Проверьте интернет.');
  }

  if (!res.ok) {
    throw new Error(`AI-сервис ответил ошибкой (${res.status})`);
  }

  const data = (await res.json()) as { text?: string; error?: string };
  if (data.error) throw new Error(data.error);
  const text = data.text?.trim();
  if (!text) throw new Error('AI-сервис не вернул ответ');
  return text;
}

/** Совет «Что посадить тут?» по истории места (бывш. ai.getPlaceAdvice). */
export function getPlaceAdvice(schemaObjectId: string): Promise<string> {
  return callAiEndpoint('place-advice', { schemaObjectId });
}

/** Диагноз болезни/вредителя по фото (бывш. ai.diagnosePhoto). */
export function diagnosePhoto(photoUrl: string, note?: string): Promise<string> {
  return callAiEndpoint('diagnose-photo', { photoUrl, note });
}

/** Персональный совет по уходу за посадкой (бывш. ai.getCareTip). */
export function getCareTip(plantingId: string): Promise<string> {
  return callAiEndpoint('care-tip', { plantingId });
}

/**
 * «Дневник здоровья растения» (задача L.2): агрегированный анализ истории
 * места — паттерны болезней за сезон и рекомендации по севообороту.
 */
export function getHealthDiary(schemaObjectId: string): Promise<string> {
  return callAiEndpoint('health-diary', { schemaObjectId });
}
