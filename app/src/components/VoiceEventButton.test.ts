/**
 * Задача G.2 — тесты парсера голосовых команд.
 */
import { describe, it, expect } from "vitest";
import { parseVoiceEvent } from "./VoiceEventButton";

describe("parseVoiceEvent", () => {
  it("«полил помидоры» → watering + помидоры", () => {
    expect(parseVoiceEvent("полил помидоры")).toEqual({
      eventType: "watering",
      note: "помидоры",
    });
  });

  it("«собрал огурцы» → harvest", () => {
    expect(parseVoiceEvent("собрал огурцы")).toEqual({
      eventType: "harvest",
      note: "огурцы",
    });
  });

  it("«подкормил розы» → fertilizing (по основе слова)", () => {
    const r = parseVoiceEvent("подкормил розы");
    expect(r.eventType).toBe("fertilizing");
    expect(r.note).toBe("розы");
  });

  it("распознаёт вредителя", () => {
    expect(parseVoiceEvent("тля на смородине").eventType).toBe("pest");
  });

  it("неизвестная фраза → other, вся фраза в заметку", () => {
    expect(parseVoiceEvent("что-то непонятное")).toEqual({
      eventType: "other",
      note: "что-то непонятное",
    });
  });

  it("не чувствителен к регистру", () => {
    expect(parseVoiceEvent("ПОЛИЛ грядку").eventType).toBe("watering");
  });

  it("пустая строка → other с пустой заметкой", () => {
    expect(parseVoiceEvent("   ")).toEqual({ eventType: "other", note: "" });
  });
});
