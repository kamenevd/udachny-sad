import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * AI-помощник (этап 32 PLAN6) — GLM (Z.AI) как backend-модель.
 * Три фичи: совет по месту (32.1), диагноз по фото (32.2), совет по уходу (32.3).
 *
 * Требует переменную окружения Convex `ZAI_API_KEY` (задать через
 * `npx convex env set ZAI_API_KEY ...` в дашборде — сюда мы не пишем,
 * задача просит не трогать деплой). Без ключа действия бросают понятную
 * ошибку, которую UI показывает через toast.
 */

const ZAI_BASE_URL = process.env.ZAI_BASE_URL ?? "https://api.z.ai/api/paas/v4";
const ZAI_TEXT_MODEL = process.env.GLM_TEXT_MODEL ?? "glm-5.2";
const ZAI_VISION_MODEL = process.env.GLM_VISION_MODEL ?? "glm-4.5v";

type ChatMessage = {
  role: "system" | "user";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
};

/** Запрос к чат-эндпоинту GLM (Z.AI), OpenAI-совместимый формат */
async function callGlm(messages: ChatMessage[], model: string): Promise<string> {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI-помощник не настроен: отсутствует ключ ZAI_API_KEY");
  }

  let res: Response;
  try {
    res = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: 1024 }),
    });
  } catch {
    throw new Error("Не получилось связаться с AI-сервисом. Проверьте интернет.");
  }

  if (!res.ok) {
    throw new Error(`AI-сервис ответил ошибкой (${res.status})`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI-сервис не вернул ответ");
  return text;
}

/** Формат даты дд.мм.гггг для промпта (без завязки на локаль клиента) */
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("ru-RU");
}

// ─── 32.1: совет по месту — «Что посадить тут?» ────────────

export const getPlaceAdvice = action({
  args: { schemaObjectId: v.id("schemaObjects") },
  handler: async (ctx, args): Promise<string> => {
    const history = await ctx.runQuery(api.plantings.getHistory, {
      schemaObjectId: args.schemaObjectId,
    });

    if (history.length === 0) {
      return "На этом месте ещё ничего не сажали — записей в истории нет. Выбирайте растение по освещённости и влажности места.";
    }

    const lines = history.map((p) => {
      const plant = p.plant ? `${p.plant.name}${p.plant.variety ? ` «${p.plant.variety}»` : ""}` : "неизвестное растение";
      const period = `${formatDate(p.plantedAt)}${p.endedAt ? ` — ${formatDate(p.endedAt)}` : " — по наст. время"}`;
      return `- ${plant}, ${period}, исход: ${p.status}${p.notes ? `, заметка: ${p.notes}` : ""}`;
    });

    const advice = await callGlm(
      [
        {
          role: "system",
          content:
            "Ты — опытный агроном-консультант российского приусадебного садоводства. " +
            "По истории посадок на одном месте дай короткий практический совет (3–5 предложений на русском, " +
            "обычный текст без markdown), что стоит посадить здесь в следующий раз с учётом севооборота " +
            "и прошлых проблем (болезни, гибель растений).",
        },
        {
          role: "user",
          content: `История посадок на месте:\n${lines.join("\n")}`,
        },
      ],
      ZAI_TEXT_MODEL,
    );

    return advice;
  },
});

// ─── 32.2: диагноз по фото — «Что это?» ────────────────────

export const diagnosePhoto = action({
  args: { photoUrl: v.string(), note: v.optional(v.string()) },
  handler: async (_ctx, args): Promise<string> => {
    return await callGlm(
      [
        {
          role: "system",
          content:
            "Ты — агроном-консультант. По фото садового растения определи вероятную болезнь или вредителя. " +
            "Ответь кратко на русском (2–4 предложения, без markdown): название проблемы и рекомендации по лечению. " +
            "Если по фото нельзя точно определить — честно скажи об этом и предложи, что проверить.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: args.note?.trim() ? `Заметка садовода: ${args.note.trim()}` : "Что за проблема на фото?" },
            { type: "image_url", image_url: { url: args.photoUrl } },
          ],
        },
      ],
      ZAI_VISION_MODEL,
    );
  },
});

// ─── 32.3: совет по уходу — «Совет» ─────────────────────────

export const getCareTip = action({
  args: { plantingId: v.id("plantings") },
  handler: async (ctx, args): Promise<string> => {
    const planting = await ctx.runQuery(api.plantings.getById, {
      plantingId: args.plantingId,
    });
    if (!planting) throw new Error("Посадка не найдена");

    const events = await ctx.runQuery(api.journalEvents.getByPlanting, {
      plantingId: args.plantingId,
    });

    const plant = planting.plant
      ? `${planting.plant.name}${planting.plant.variety ? ` «${planting.plant.variety}»` : ""} (${planting.plant.plantType})`
      : "растение";

    const eventLines = events
      .slice(0, 15)
      .map((e) => `- ${formatDate(e.eventDate)}: ${e.eventType}${e.title ? ` — ${e.title}` : ""}${e.description ? `. ${e.description}` : ""}`);

    const advice = await callGlm(
      [
        {
          role: "system",
          content:
            "Ты — опытный агроном-консультант. Дай короткий персональный совет по уходу (3–5 предложений на русском, " +
            "без markdown) за конкретным растением, опираясь на его вид и историю записей журнала наблюдений.",
        },
        {
          role: "user",
          content:
            `Растение: ${plant}, посажено ${formatDate(planting.plantedAt)}, статус: ${planting.status}.\n` +
            (eventLines.length > 0
              ? `Журнал наблюдений:\n${eventLines.join("\n")}`
              : "Записей в журнале пока нет."),
        },
      ],
      ZAI_TEXT_MODEL,
    );

    return advice;
  },
});
