/**
 * Задача G.2 — тесты парсера голосовых команд.
 */
import { describe, it, expect } from "vitest";
import { parseVoiceEvent } from "./VoiceEventButton";

describe("parseVoiceEvent", () => {
  it("«полил розы» → watering + розы", () => {
    expect(parseVoiceEvent("полил розы")).toEqual({
      eventType: "watering",
      note: "розы",
    });
  });

  it("«зацвело у пионов» → blooming", () => {
    expect(parseVoiceEvent("зацвело у пионов").eventType).toBe("blooming");
  });

  it("«подстриг изгородь» → pruning", () => {
    expect(parseVoiceEvent("подстриг изгородь")).toEqual({
      eventType: "pruning",
      note: "изгородь",
    });
  });

  it("«подкормил розы» → fertilizing (по основе слова)", () => {
    const r = parseVoiceEvent("подкормил розы");
    expect(r.eventType).toBe("fertilizing");
    expect(r.note).toBe("розы");
  });

  it("распознаёт вредителя", () => {
    expect(parseVoiceEvent("тля на розах").eventType).toBe("pest");
  });

  it("неизвестная фраза → other, вся фраза в заметку", () => {
    expect(parseVoiceEvent("что-то непонятное")).toEqual({
      eventType: "other",
      note: "что-то непонятное",
    });
  });

  it("не чувствителен к регистру", () => {
    expect(parseVoiceEvent("ПОЛИЛ клумбу").eventType).toBe("watering");
  });

  it("пустая строка → other с пустой заметкой", () => {
    expect(parseVoiceEvent("   ")).toEqual({ eventType: "other", note: "" });
  });
});
