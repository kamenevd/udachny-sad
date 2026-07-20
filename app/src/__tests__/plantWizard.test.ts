/**
 * PLAN12 задача 15 — логика мастера подбора растений и справочник-каталог.
 */

import { describe, it, expect } from 'vitest';
import {
  colorFamilyOf, matchPlants, matchesHeight, scorePlant,
} from '../components/PlantWizard/matchPlants';
import { PLANT_CATALOG, catalogById, catalogToPlantFields } from '../data/plantCatalog';
import {
  BED_TEMPLATES, bedTemplateById, templatesForObjectType, templateTotalCount,
} from '../data/bedTemplates';

describe('справочник растений', () => {
  it('содержит 30+ декоративных растений (критерий PLAN12)', () => {
    expect(PLANT_CATALOG.length).toBeGreaterThanOrEqual(30);
  });

  it('catalogId уникальны', () => {
    const ids = PLANT_CATALOG.map((p) => p.catalogId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('у каждого растения заполнены характеристики', () => {
    for (const p of PLANT_CATALOG) {
      expect(p.name, p.catalogId).toBeTruthy();
      expect(p.latinName, p.catalogId).toBeTruthy();
      expect(p.primaryColor, p.catalogId).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.heightCm, p.catalogId).toBeGreaterThan(0);
      expect(['full_sun', 'partial_shade', 'full_shade']).toContain(p.sunExposure);
      expect(['sandy', 'loamy', 'clay', 'any']).toContain(p.soilType);
      expect(['low', 'medium', 'high']).toContain(p.moisture);
      for (const m of p.bloomMonths) {
        expect(m, `${p.catalogId} месяц ${m}`).toBeGreaterThanOrEqual(1);
        expect(m, `${p.catalogId} месяц ${m}`).toBeLessThanOrEqual(12);
      }
    }
  });

  it('покрывает все категории PLAN12', () => {
    const types = new Set(PLANT_CATALOG.map((p) => p.plantType));
    for (const t of ['perennial', 'conifer', 'rose', 'bulb', 'annual', 'shrub']) {
      expect(types.has(t as never), t).toBe(true);
    }
  });

  it('incompatible_ids ссылаются на существующие растения', () => {
    for (const p of PLANT_CATALOG) {
      for (const id of p.incompatibleIds) {
        expect(catalogById(id), `${p.catalogId} → ${id}`).toBeDefined();
      }
    }
  });

  it('хвойные не цветут, а розы цветут летом', () => {
    const thuja = catalogById('thuja-smaragd');
    expect(thuja?.bloomMonths).toEqual([]);
    const rose = catalogById('rose-tea-hybrid');
    expect(rose?.bloomMonths).toContain(7);
  });

  it('конвертация в поля записи PocketBase — snake_case', () => {
    const fields = catalogToPlantFields(PLANT_CATALOG[0]);
    expect(fields).toHaveProperty('bloom_months');
    expect(fields).toHaveProperty('sun_exposure');
    expect(fields).toHaveProperty('primary_color');
    expect(fields.catalogId).toBe(PLANT_CATALOG[0].catalogId);
  });
});

describe('шаблоны клумб', () => {
  it('есть все пять шаблонов из плана', () => {
    const ids = BED_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining(['mixborder', 'rockery', 'rosarium', 'border', 'parterre']),
    );
  });

  it('состав шаблонов ссылается на реальные растения', () => {
    for (const t of BED_TEMPLATES) {
      expect(t.entries.length, t.id).toBeGreaterThan(0);
      for (const e of t.entries) {
        expect(catalogById(e.catalogId), `${t.id} → ${e.catalogId}`).toBeDefined();
        expect(e.quantity, `${t.id} → ${e.catalogId}`).toBeGreaterThan(0);
      }
    }
  });

  it('в каждом шаблоне есть все три яруса или хотя бы центр и край', () => {
    for (const t of BED_TEMPLATES) {
      const tiers = new Set(t.entries.map((e) => e.tier));
      expect(tiers.has('center'), t.id).toBe(true);
      expect(tiers.has('edge'), t.id).toBe(true);
    }
  });

  it('розарий не содержит хвойных — они несовместимы с розами', () => {
    const rosarium = bedTemplateById('rosarium');
    const types = rosarium?.entries.map((e) => catalogById(e.catalogId)?.plantType);
    expect(types).not.toContain('conifer');
  });

  it('подбирает шаблоны по типу объекта схемы', () => {
    expect(templatesForObjectType('flowerbed').length).toBeGreaterThan(0);
    expect(templatesForObjectType('path').map((t) => t.id)).toContain('border');
    expect(templatesForObjectType('building')).toEqual([]);
  });

  it('считает общее число саженцев', () => {
    const border = bedTemplateById('border');
    expect(templateTotalCount(border!)).toBe(
      border!.entries.reduce((s, e) => s + e.quantity, 0),
    );
  });
});

describe('colorFamilyOf', () => {
  it('красный и оранжевый — тёплые', () => {
    expect(colorFamilyOf('#C4243C')).toBe('warm');
    expect(colorFamilyOf('#E8901E')).toBe('warm');
  });

  it('синий и фиолетовый — холодные', () => {
    expect(colorFamilyOf('#4A63C4')).toBe('cool');
    expect(colorFamilyOf('#8B6AC4')).toBe('cool');
  });

  it('белое и пастельное — белая гамма', () => {
    expect(colorFamilyOf('#FAF6E8')).toBe('white');
    expect(colorFamilyOf('#F2F0E4')).toBe('white');
  });

  it('мусор на входе не роняет подбор', () => {
    expect(colorFamilyOf('не цвет')).toBe('any');
    expect(colorFamilyOf('')).toBe('any');
  });
});

describe('matchesHeight', () => {
  it('раскладывает по диапазонам', () => {
    expect(matchesHeight(25, 'low')).toBe(true);
    expect(matchesHeight(80, 'low')).toBe(false);
    expect(matchesHeight(80, 'medium')).toBe(true);
    expect(matchesHeight(300, 'tall')).toBe(true);
    expect(matchesHeight(300, 'any')).toBe(true);
  });

  it('границы диапазонов не пересекаются', () => {
    expect(matchesHeight(40, 'low')).toBe(false);
    expect(matchesHeight(40, 'medium')).toBe(true);
    expect(matchesHeight(120, 'medium')).toBe(false);
    expect(matchesHeight(120, 'tall')).toBe(true);
  });
});

describe('подбор растений', () => {
  it('для тени предлагает тенелюбивые и не предлагает розы', () => {
    const results = matchPlants({ sunExposure: 'full_shade', moisture: 'high' });
    const ids = results.map((r) => r.plant.catalogId);
    expect(ids).toContain('hosta');
    expect(ids.some((id) => id.startsWith('rose'))).toBe(false);
  });

  it('для сухого солнца предлагает засухоустойчивые', () => {
    const ids = matchPlants({
      sunExposure: 'full_sun', soilType: 'sandy', moisture: 'low',
    }).map((r) => r.plant.catalogId);
    expect(ids).toContain('sedum-spectabile');
  });

  it('растения шаблона поднимаются наверх выдачи', () => {
    const results = matchPlants({ templateId: 'rosarium', sunExposure: 'full_sun' });
    const rosarium = bedTemplateById('rosarium')!;
    const templateIds = rosarium.entries.map((e) => e.catalogId);
    expect(templateIds).toContain(results[0].plant.catalogId);
    expect(results[0].reasons).toContain('Входит в шаблон «Розарий»');
  });

  it('фильтр по высоте отсекает несоразмерное', () => {
    const results = matchPlants({ sunExposure: 'full_sun', height: 'low' });
    for (const r of results) expect(r.plant.heightCm).toBeLessThan(40);
  });

  it('фильтр по цвету оставляет только выбранную гамму', () => {
    const results = matchPlants({ sunExposure: 'full_sun', color: 'cool' });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(colorFamilyOf(r.plant.primaryColor)).toBe('cool');
  });

  it('выдача отсортирована по убыванию совпадения и ограничена limit', () => {
    const results = matchPlants({ sunExposure: 'full_sun' }, PLANT_CATALOG, 5);
    expect(results.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('без критериев ничего не выдаёт — мастер должен спросить условия', () => {
    expect(matchPlants({})).toEqual([]);
  });

  it('светолюбивые никогда не предлагаются для глухой тени', () => {
    // Свет — единственное жёсткое условие: остальное вопрос вкуса, а без
    // солнца растение не выживет, сколько бы очков ни набрало по почве.
    const results = matchPlants({ sunExposure: 'full_shade' });
    for (const r of results) expect(r.plant.sunExposure).not.toBe('full_sun');

    const sunny = matchPlants({ sunExposure: 'full_sun' });
    for (const r of sunny) expect(r.plant.sunExposure).not.toBe('full_shade');
  });

  it('противоречивые условия дают короткую выдачу со слабыми совпадениями', () => {
    // Мастер намеренно не возвращает пустоту при странных сочетаниях:
    // лучше показать компромиссы, чем тупик. Но их мало и score низкий.
    const results = matchPlants({
      sunExposure: 'full_shade',
      soilType: 'sandy',
      moisture: 'low',
      height: 'tall',
      color: 'warm',
    });
    expect(results.length).toBeLessThan(6);
    for (const r of results) {
      expect(r.plant.sunExposure).not.toBe('full_sun');
      expect(r.score).toBeLessThanOrEqual(3);
    }

    // Согласованные условия дают заметно более сильные совпадения.
    const coherent = matchPlants({
      sunExposure: 'full_shade', soilType: 'loamy', moisture: 'high', height: 'low',
    });
    expect(coherent[0].score).toBeGreaterThan(3);
  });

  it('scorePlant объясняет, почему растение подошло', () => {
    const hosta = catalogById('hosta')!;
    const { reasons } = scorePlant(hosta, {
      sunExposure: 'full_shade', moisture: 'high',
    });
    expect(reasons).toContain('Подходит по освещению');
    expect(reasons).toContain('Подходит по влаге');
  });
});
