/**
 * Snapshot-тесты компонентов — PlantCard, Stamp, Banner (задача 28.1)
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PlantCard } from "../components/PlantCard";
import { Stamp } from "../components/Stamp";
import { Banner } from "../components/Banner";

describe("PlantCard snapshot", () => {
  it("полная карточка с фото", () => {
    const { asFragment } = render(
      <PlantCard
        cardNumber={42}
        type="Плодовое дерево"
        name="Яблоня × 1"
        variety="Антоновка"
        plantedAt="12.04.2024"
        status="Растёт"
        positionNote="Грядка 3 — у забора"
        photoUrl="https://example.com/photo.jpg"
      />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it("минимальная карточка без данных", () => {
    const { asFragment } = render(<PlantCard cardNumber={7} />);
    expect(asFragment()).toMatchSnapshot();
  });
});

describe("Stamp snapshot", () => {
  it("оттиск с действием ПОСАЖЕНО", () => {
    const { asFragment } = render(<Stamp action="ПОСАЖЕНО" />);
    expect(asFragment()).toMatchSnapshot();
  });
});

describe("Banner snapshot", () => {
  it("вымпел со стандартной подписью", () => {
    const { asFragment } = render(<Banner days={5} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("вымпел с кастомной подписью и склонением дней", () => {
    const { asFragment } = render(<Banner days={21} label="СТРИК ПОЛИВА" />);
    expect(asFragment()).toMatchSnapshot();
  });
});
