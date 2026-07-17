/**
 * Цвета для генплана участка (Konva canvas)
 * Сопоставлены с токенами v5.1 DESIGN.md §2 + §3
 */

export const canvasColors = {
  // Бумага и линии
  paper: '#F7EFD9',
  surface: '#FCF6E4',
  ink: '#202A38',
  inkMuted: '#5E6470',
  gridBlue: '#D5DEE8',
  gridBlue5: '#B9C7D6',

  // Главные акценты
  red: '#BF2E24',
  redPress: '#9E241C',
  gold: '#C99A2C',
  green: '#3E7B3A',
  blueInk: '#2B4C7E',

  // Заливки объектов (§3.2)
  grassFill: '#E9F0CF',
  grassPattern: '#7FA457',

  bedFill: '#C08A57',
  bedPattern: '#8F6741',

  flowerFill: '#E8A0AC',
  flowerPattern: '#C4747F',

  pathFill: '#E6DCC0',
  pathPattern: '#B8AA82',

  buildingFill: '#C9C2AC',
  buildingPattern: 'rgba(32,42,56,.55)',

  greenhouseFill: '#E2EEE9',
  greenhousePattern: '#6E8F86',

  waterFill: '#A9CFE2',
  waterPattern: '#3E6E8E',

  treeFill: '#6FAE52',

  shrubFill: '#8FC468',

  // Зоны условий (§3.3)
  zoneSun: 'rgba(255,214,74,.14)',
  zoneSunBorder: 'rgba(214,166,26,.85)',

  zonePartial: 'rgba(90,105,120,.24)',
  zonePartialBorder: 'rgba(90,105,120,.85)',

  zoneShadow: 'rgba(42,56,70,.42)',
  zoneShadowBorder: 'rgba(42,56,70,.9)',
  zoneShadowPattern: 'rgba(42,56,70,.55)',

  zoneDry: 'rgba(217,164,74,.22)',
  zoneDryBorder: 'rgba(191,138,48,.85)',

  zoneModerate: 'rgba(95,168,211,.18)',
  zoneModerateBorder: 'rgba(95,168,211,.85)',

  zoneWet: 'rgba(46,111,163,.34)',
  zoneWetBorder: 'rgba(46,111,163,.9)',
  zoneWetPattern: 'rgba(46,111,163,.5)',

  // Ночью (текст белый)
  nightText: '#FFFFFF',
  nightBg: '#1E2C48',
};