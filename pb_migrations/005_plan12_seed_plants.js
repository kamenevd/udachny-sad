/// <reference path="../pb_data/types.d.ts" />
/**
 * PLAN12 задача 2 — предзаполнение справочника декоративными растениями
 * (43 видов, климат Подмосковья, зона зимостойкости 4).
 *
 * ⚠️ Файл СГЕНЕРИРОВАН из app/src/data/plantCatalog.json скриптом
 * app/scripts/gen-seed-migration.mjs — правьте JSON и перегенерируйте,
 * иначе справочник фронта и seed бэкенда разойдутся.
 *
 * Записи `plants` привязаны к пользователю (userId, cascadeDelete), поэтому
 * seed раскладывает каталог по всем существующим на момент миграции юзерам.
 * Для тех, кто зарегистрируется позже, тот же каталог доступен на фронте —
 * кнопка «Загрузить примеры растений» на пустом экране справочника (задача 13).
 * Повторный запуск безопасен: растение с таким catalogId у юзера пропускается.
 */
const SEED_PLANTS = [
  {
    "catalogId": "phlox-paniculata",
    "plantType": "perennial",
    "name": "Флокс метельчатый",
    "description": "Ароматный многолетник для середины миксбордера. Крупные шапки соцветий держатся до сентября.",
    "latin_name": "Phlox paniculata",
    "bloom_months": [
      7,
      8,
      9
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#E86A9A",
    "height_cm": 90,
    "incompatible_ids": []
  },
  {
    "catalogId": "hemerocallis",
    "plantType": "perennial",
    "name": "Лилейник гибридный",
    "description": "Неприхотливый многолетник: каждый цветок живёт день, но куст цветёт больше месяца.",
    "latin_name": "Hemerocallis hybrida",
    "bloom_months": [
      6,
      7,
      8
    ],
    "sun_exposure": "full_sun",
    "soil_type": "any",
    "moisture": "medium",
    "primary_color": "#E8A33D",
    "height_cm": 70,
    "incompatible_ids": []
  },
  {
    "catalogId": "hosta",
    "plantType": "perennial",
    "name": "Хоста",
    "description": "Теневая классика. Ценится за листву; цветоносы поднимаются в июле-августе.",
    "latin_name": "Hosta",
    "bloom_months": [
      7,
      8
    ],
    "sun_exposure": "full_shade",
    "soil_type": "loamy",
    "moisture": "high",
    "primary_color": "#C8B8E0",
    "height_cm": 45,
    "incompatible_ids": []
  },
  {
    "catalogId": "paeonia-lactiflora",
    "plantType": "perennial",
    "name": "Пион молочноцветковый",
    "description": "Долгожитель клумбы — на одном месте до 20 лет. Не любит пересадок и соседства с крупными корнями.",
    "latin_name": "Paeonia lactiflora",
    "bloom_months": [
      5,
      6
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#E4849B",
    "height_cm": 80,
    "incompatible_ids": [
      "thuja-smaragd",
      "picea-conica"
    ]
  },
  {
    "catalogId": "astilbe-arendsii",
    "plantType": "perennial",
    "name": "Астильба Арендса",
    "description": "Ажурные метёлки в полутени. Требует стабильно влажной почвы.",
    "latin_name": "Astilbe × arendsii",
    "bloom_months": [
      6,
      7,
      8
    ],
    "sun_exposure": "partial_shade",
    "soil_type": "loamy",
    "moisture": "high",
    "primary_color": "#D96B8A",
    "height_cm": 60,
    "incompatible_ids": []
  },
  {
    "catalogId": "iris-sibirica",
    "plantType": "perennial",
    "name": "Ирис сибирский",
    "description": "Зимостойкий ирис для Подмосковья. Декоративен и после цветения — узкой листвой.",
    "latin_name": "Iris sibirica",
    "bloom_months": [
      6
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#6B72C4",
    "height_cm": 80,
    "incompatible_ids": []
  },
  {
    "catalogId": "echinacea-purpurea",
    "plantType": "perennial",
    "name": "Эхинацея пурпурная",
    "description": "Засухоустойчивый многолетник для солнечных цветников. Привлекает бабочек.",
    "latin_name": "Echinacea purpurea",
    "bloom_months": [
      7,
      8,
      9
    ],
    "sun_exposure": "full_sun",
    "soil_type": "sandy",
    "moisture": "low",
    "primary_color": "#C96A9E",
    "height_cm": 90,
    "incompatible_ids": []
  },
  {
    "catalogId": "delphinium-elatum",
    "plantType": "perennial",
    "name": "Дельфиниум высокий",
    "description": "Вертикаль заднего плана. При обрезке отцветших свечей даёт вторую волну в сентябре.",
    "latin_name": "Delphinium elatum",
    "bloom_months": [
      6,
      7,
      9
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#4A63C4",
    "height_cm": 150,
    "incompatible_ids": []
  },
  {
    "catalogId": "sedum-spectabile",
    "plantType": "perennial",
    "name": "Очиток видный",
    "description": "Осенний акцент и главный житель альпийской горки. Переносит бедные сухие почвы.",
    "latin_name": "Hylotelephium spectabile",
    "bloom_months": [
      8,
      9,
      10
    ],
    "sun_exposure": "full_sun",
    "soil_type": "sandy",
    "moisture": "low",
    "primary_color": "#D98BA8",
    "height_cm": 40,
    "incompatible_ids": []
  },
  {
    "catalogId": "heuchera",
    "plantType": "perennial",
    "name": "Гейхера гибридная",
    "description": "Цветная листва весь сезон — от пурпурной до янтарной. Идеальна для бордюра в полутени.",
    "latin_name": "Heuchera hybrida",
    "bloom_months": [
      6,
      7
    ],
    "sun_exposure": "partial_shade",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#C4566E",
    "height_cm": 40,
    "incompatible_ids": []
  },
  {
    "catalogId": "aquilegia-vulgaris",
    "plantType": "perennial",
    "name": "Аквилегия обыкновенная",
    "description": "Водосбор — ранний многолетник полутени, охотно даёт самосев.",
    "latin_name": "Aquilegia vulgaris",
    "bloom_months": [
      5,
      6
    ],
    "sun_exposure": "partial_shade",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#7B5EA8",
    "height_cm": 60,
    "incompatible_ids": []
  },
  {
    "catalogId": "rudbeckia-fulgida",
    "plantType": "perennial",
    "name": "Рудбекия блестящая",
    "description": "Золотые ромашки до заморозков. Устойчива к жаре и не разваливается без подвязки.",
    "latin_name": "Rudbeckia fulgida",
    "bloom_months": [
      7,
      8,
      9
    ],
    "sun_exposure": "full_sun",
    "soil_type": "any",
    "moisture": "medium",
    "primary_color": "#E8B32C",
    "height_cm": 70,
    "incompatible_ids": []
  },
  {
    "catalogId": "alchemilla-mollis",
    "plantType": "perennial",
    "name": "Манжетка мягкая",
    "description": "Мягкий зелёно-жёлтый край цветника. Смягчает контрастные сочетания соседей.",
    "latin_name": "Alchemilla mollis",
    "bloom_months": [
      6,
      7
    ],
    "sun_exposure": "partial_shade",
    "soil_type": "any",
    "moisture": "medium",
    "primary_color": "#C8D46A",
    "height_cm": 40,
    "incompatible_ids": []
  },
  {
    "catalogId": "bergenia-crassifolia",
    "plantType": "perennial",
    "name": "Бадан толстолистный",
    "description": "Зимует с листьями, зацветает одним из первых — сразу после схода снега.",
    "latin_name": "Bergenia crassifolia",
    "bloom_months": [
      4,
      5
    ],
    "sun_exposure": "partial_shade",
    "soil_type": "any",
    "moisture": "medium",
    "primary_color": "#D46A9E",
    "height_cm": 40,
    "incompatible_ids": []
  },
  {
    "catalogId": "thuja-smaragd",
    "plantType": "conifer",
    "name": "Туя западная «Смарагд»",
    "description": "Плотная конусовидная вечнозелёная стена. Подкисляет почву и сушит её вокруг себя.",
    "latin_name": "Thuja occidentalis 'Smaragd'",
    "bloom_months": [],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#3E7B3A",
    "height_cm": 400,
    "incompatible_ids": [
      "rose-tea-hybrid",
      "rose-climbing",
      "rose-floribunda",
      "paeonia-lactiflora"
    ]
  },
  {
    "catalogId": "juniperus-sabina",
    "plantType": "conifer",
    "name": "Можжевельник казацкий",
    "description": "Стелющийся хвойный для склонов и горок. Может быть промежуточным хозяином ржавчины роз.",
    "latin_name": "Juniperus sabina",
    "bloom_months": [],
    "sun_exposure": "full_sun",
    "soil_type": "sandy",
    "moisture": "low",
    "primary_color": "#4E7B5A",
    "height_cm": 100,
    "incompatible_ids": [
      "rose-tea-hybrid",
      "rose-climbing",
      "rose-floribunda",
      "rose-ground-cover"
    ]
  },
  {
    "catalogId": "picea-conica",
    "plantType": "conifer",
    "name": "Ель канадская «Коника»",
    "description": "Аккуратный конус до 2 м. Весной страдает от солнечных ожогов — нужно притенение.",
    "latin_name": "Picea glauca 'Conica'",
    "bloom_months": [],
    "sun_exposure": "partial_shade",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#2F6B4A",
    "height_cm": 200,
    "incompatible_ids": [
      "paeonia-lactiflora"
    ]
  },
  {
    "catalogId": "pinus-mugo",
    "plantType": "conifer",
    "name": "Сосна горная «Мугус»",
    "description": "Плотная подушка для рокария. Абсолютно зимостойка, мирится с бедной песчаной почвой.",
    "latin_name": "Pinus mugo var. mughus",
    "bloom_months": [],
    "sun_exposure": "full_sun",
    "soil_type": "sandy",
    "moisture": "low",
    "primary_color": "#3A6B48",
    "height_cm": 150,
    "incompatible_ids": []
  },
  {
    "catalogId": "thuja-danica",
    "plantType": "conifer",
    "name": "Туя западная «Даника»",
    "description": "Шаровидный карлик до 80 см — акцент бордюра и партерного цветника.",
    "latin_name": "Thuja occidentalis 'Danica'",
    "bloom_months": [],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#4A8B4A",
    "height_cm": 80,
    "incompatible_ids": []
  },
  {
    "catalogId": "hydrangea-paniculata",
    "plantType": "shrub",
    "name": "Гортензия метельчатая",
    "description": "Главный кустарник второй половины лета. Соцветия белеют, затем розовеют к осени.",
    "latin_name": "Hydrangea paniculata",
    "bloom_months": [
      7,
      8,
      9
    ],
    "sun_exposure": "partial_shade",
    "soil_type": "loamy",
    "moisture": "high",
    "primary_color": "#F0E4E8",
    "height_cm": 200,
    "incompatible_ids": []
  },
  {
    "catalogId": "hydrangea-annabelle",
    "plantType": "shrub",
    "name": "Гортензия древовидная «Аннабель»",
    "description": "Огромные белые шары на молодых побегах. Обрезается коротко, зимует без укрытия.",
    "latin_name": "Hydrangea arborescens 'Annabelle'",
    "bloom_months": [
      6,
      7,
      8,
      9
    ],
    "sun_exposure": "partial_shade",
    "soil_type": "loamy",
    "moisture": "high",
    "primary_color": "#F2F0E4",
    "height_cm": 150,
    "incompatible_ids": []
  },
  {
    "catalogId": "syringa-vulgaris",
    "plantType": "shrub",
    "name": "Сирень обыкновенная",
    "description": "Классика русского сада. Мощная корневая система угнетает нежных соседей.",
    "latin_name": "Syringa vulgaris",
    "bloom_months": [
      5,
      6
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#A87BC4",
    "height_cm": 350,
    "incompatible_ids": [
      "rose-tea-hybrid",
      "rose-floribunda"
    ]
  },
  {
    "catalogId": "philadelphus-coronarius",
    "plantType": "shrub",
    "name": "Чубушник венечный",
    "description": "«Садовый жасмин» — сильный аромат в июне. Цветёт на побегах прошлого года.",
    "latin_name": "Philadelphus coronarius",
    "bloom_months": [
      6,
      7
    ],
    "sun_exposure": "full_sun",
    "soil_type": "any",
    "moisture": "medium",
    "primary_color": "#FAF6E8",
    "height_cm": 250,
    "incompatible_ids": []
  },
  {
    "catalogId": "spiraea-japonica",
    "plantType": "shrub",
    "name": "Спирея японская",
    "description": "Компактный кустарник для живого бордюра, цветёт всё лето розовыми щитками.",
    "latin_name": "Spiraea japonica",
    "bloom_months": [
      6,
      7,
      8
    ],
    "sun_exposure": "full_sun",
    "soil_type": "any",
    "moisture": "medium",
    "primary_color": "#DE7A9E",
    "height_cm": 80,
    "incompatible_ids": []
  },
  {
    "catalogId": "cornus-alba",
    "plantType": "shrub",
    "name": "Дерен белый",
    "description": "Красные побеги держат декоративность всю зиму — важный акцент зимнего сада.",
    "latin_name": "Cornus alba",
    "bloom_months": [
      5,
      6
    ],
    "sun_exposure": "partial_shade",
    "soil_type": "any",
    "moisture": "high",
    "primary_color": "#F2EEDC",
    "height_cm": 250,
    "incompatible_ids": []
  },
  {
    "catalogId": "berberis-thunbergii",
    "plantType": "shrub",
    "name": "Барбарис Тунберга",
    "description": "Пурпурная или жёлтая листва весь сезон. Хорошо стрижётся в низкую изгородь.",
    "latin_name": "Berberis thunbergii",
    "bloom_months": [
      5
    ],
    "sun_exposure": "full_sun",
    "soil_type": "sandy",
    "moisture": "low",
    "primary_color": "#E8C84A",
    "height_cm": 120,
    "incompatible_ids": []
  },
  {
    "catalogId": "rose-tea-hybrid",
    "plantType": "rose",
    "name": "Роза чайно-гибридная",
    "description": "Крупные одиночные цветки на длинном стебле. В Подмосковье требует зимнего укрытия.",
    "latin_name": "Rosa × hybrida (Hybrid Tea)",
    "bloom_months": [
      6,
      7,
      8,
      9
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#C4243C",
    "height_cm": 90,
    "incompatible_ids": [
      "thuja-smaragd",
      "juniperus-sabina",
      "syringa-vulgaris"
    ]
  },
  {
    "catalogId": "rose-climbing",
    "plantType": "rose",
    "name": "Роза плетистая",
    "description": "Для арок и опор. Плети снимают и укладывают под укрытие до морозов.",
    "latin_name": "Rosa × hybrida (Climbing)",
    "bloom_months": [
      6,
      7,
      8
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#D4405E",
    "height_cm": 300,
    "incompatible_ids": [
      "thuja-smaragd",
      "juniperus-sabina"
    ]
  },
  {
    "catalogId": "rose-floribunda",
    "plantType": "rose",
    "name": "Роза флорибунда",
    "description": "Обильное кистевое цветение волнами до заморозков. Устойчивее чайно-гибридных.",
    "latin_name": "Rosa × hybrida (Floribunda)",
    "bloom_months": [
      6,
      7,
      8,
      9
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#E8845E",
    "height_cm": 80,
    "incompatible_ids": [
      "thuja-smaragd",
      "juniperus-sabina",
      "syringa-vulgaris"
    ]
  },
  {
    "catalogId": "rose-ground-cover",
    "plantType": "rose",
    "name": "Роза почвопокровная",
    "description": "Стелется ковром, почти не требует обрезки. Хороша на склонах и в бордюре.",
    "latin_name": "Rosa × hybrida (Ground Cover)",
    "bloom_months": [
      6,
      7,
      8,
      9
    ],
    "sun_exposure": "full_sun",
    "soil_type": "sandy",
    "moisture": "medium",
    "primary_color": "#E86A8A",
    "height_cm": 50,
    "incompatible_ids": [
      "juniperus-sabina"
    ]
  },
  {
    "catalogId": "rosa-rugosa",
    "plantType": "rose",
    "name": "Роза морщинистая (парковая)",
    "description": "Самая зимостойкая роза — укрытие не нужно. Даёт крупные декоративные плоды.",
    "latin_name": "Rosa rugosa",
    "bloom_months": [
      6,
      7,
      8
    ],
    "sun_exposure": "full_sun",
    "soil_type": "sandy",
    "moisture": "low",
    "primary_color": "#D4547E",
    "height_cm": 150,
    "incompatible_ids": []
  },
  {
    "catalogId": "tulipa-darwin",
    "plantType": "bulb",
    "name": "Тюльпан (Дарвинов гибрид)",
    "description": "Крупный майский тюльпан на прочном цветоносе. Луковицы выкапывают раз в 2-3 года.",
    "latin_name": "Tulipa × Darwin hybrid",
    "bloom_months": [
      4,
      5
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#D42B34",
    "height_cm": 55,
    "incompatible_ids": []
  },
  {
    "catalogId": "narcissus",
    "plantType": "bulb",
    "name": "Нарцисс",
    "description": "Растёт на одном месте годами и не интересен грызунам — луковицы ядовиты.",
    "latin_name": "Narcissus",
    "bloom_months": [
      4,
      5
    ],
    "sun_exposure": "partial_shade",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#F2D24A",
    "height_cm": 40,
    "incompatible_ids": []
  },
  {
    "catalogId": "hyacinthus-orientalis",
    "plantType": "bulb",
    "name": "Гиацинт восточный",
    "description": "Плотная ароматная свеча. В зоне 4 требует мульчирования на зиму.",
    "latin_name": "Hyacinthus orientalis",
    "bloom_months": [
      4,
      5
    ],
    "sun_exposure": "full_sun",
    "soil_type": "sandy",
    "moisture": "medium",
    "primary_color": "#8B6AC4",
    "height_cm": 25,
    "incompatible_ids": []
  },
  {
    "catalogId": "crocus-vernus",
    "plantType": "bulb",
    "name": "Крокус весенний",
    "description": "Зацветает первым, прямо из-под снега. Хорош в приствольных кругах и на газоне.",
    "latin_name": "Crocus vernus",
    "bloom_months": [
      3,
      4
    ],
    "sun_exposure": "full_sun",
    "soil_type": "sandy",
    "moisture": "low",
    "primary_color": "#9B7AC8",
    "height_cm": 12,
    "incompatible_ids": []
  },
  {
    "catalogId": "lilium-asiatic",
    "plantType": "bulb",
    "name": "Лилия азиатская",
    "description": "Самая зимостойкая группа лилий. Любит, когда «голова на солнце, ноги в тени».",
    "latin_name": "Lilium Asiatic hybrids",
    "bloom_months": [
      6,
      7
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#E8703A",
    "height_cm": 100,
    "incompatible_ids": []
  },
  {
    "catalogId": "muscari-armeniacum",
    "plantType": "bulb",
    "name": "Мускари армянский",
    "description": "Синий ковёр по краю клумбы в апреле. Быстро разрастается самосевом.",
    "latin_name": "Muscari armeniacum",
    "bloom_months": [
      4,
      5
    ],
    "sun_exposure": "full_sun",
    "soil_type": "any",
    "moisture": "medium",
    "primary_color": "#4A63B4",
    "height_cm": 20,
    "incompatible_ids": []
  },
  {
    "catalogId": "petunia-hybrida",
    "plantType": "annual",
    "name": "Петуния гибридная",
    "description": "Непрерывное цветение с июня до заморозков. Требует регулярных подкормок.",
    "latin_name": "Petunia × hybrida",
    "bloom_months": [
      6,
      7,
      8,
      9
    ],
    "sun_exposure": "full_sun",
    "soil_type": "any",
    "moisture": "medium",
    "primary_color": "#C4407E",
    "height_cm": 30,
    "incompatible_ids": []
  },
  {
    "catalogId": "tagetes-patula",
    "plantType": "annual",
    "name": "Бархатцы отклонённые",
    "description": "Неприхотливы и оздоравливают почву — корни подавляют нематоду.",
    "latin_name": "Tagetes patula",
    "bloom_months": [
      6,
      7,
      8,
      9,
      10
    ],
    "sun_exposure": "full_sun",
    "soil_type": "any",
    "moisture": "medium",
    "primary_color": "#E8901E",
    "height_cm": 30,
    "incompatible_ids": []
  },
  {
    "catalogId": "salvia-splendens",
    "plantType": "annual",
    "name": "Сальвия сверкающая",
    "description": "Огненно-красные свечи — сильный акцент партерного цветника.",
    "latin_name": "Salvia splendens",
    "bloom_months": [
      7,
      8,
      9
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#C42B24",
    "height_cm": 35,
    "incompatible_ids": []
  },
  {
    "catalogId": "zinnia-elegans",
    "plantType": "annual",
    "name": "Цинния изящная",
    "description": "Тёплая гамма от лимонной до бордовой. Не переносит даже лёгких заморозков.",
    "latin_name": "Zinnia elegans",
    "bloom_months": [
      7,
      8,
      9
    ],
    "sun_exposure": "full_sun",
    "soil_type": "loamy",
    "moisture": "medium",
    "primary_color": "#E85A6A",
    "height_cm": 60,
    "incompatible_ids": []
  },
  {
    "catalogId": "lobelia-erinus",
    "plantType": "annual",
    "name": "Лобелия эринус",
    "description": "Синее облако для края клумбы и кашпо. В жару нужен постоянный полив.",
    "latin_name": "Lobelia erinus",
    "bloom_months": [
      6,
      7,
      8,
      9
    ],
    "sun_exposure": "partial_shade",
    "soil_type": "loamy",
    "moisture": "high",
    "primary_color": "#4A6AC4",
    "height_cm": 20,
    "incompatible_ids": []
  },
  {
    "catalogId": "ageratum-houstonianum",
    "plantType": "annual",
    "name": "Агератум Хоустона",
    "description": "Пушистые сиреневые соцветия, держит форму без обрезки. Классика бордюра.",
    "latin_name": "Ageratum houstonianum",
    "bloom_months": [
      6,
      7,
      8,
      9
    ],
    "sun_exposure": "full_sun",
    "soil_type": "any",
    "moisture": "medium",
    "primary_color": "#8B8BD4",
    "height_cm": 25,
    "incompatible_ids": []
  }
];

migrate((app) => {
  const users = app.findAllRecords("users");
  for (const user of users) {
    for (const plant of SEED_PLANTS) {
      const existing = app.findFirstRecordByFilter(
        "plants",
        "userId = {:uid} && catalogId = {:cid}",
        { uid: user.id, cid: plant.catalogId },
      );
      if (existing) continue;

      const record = new Record(app.findCollectionByNameOrId("plants"));
      record.set("userId", user.id);
      for (const [key, value] of Object.entries(plant)) {
        record.set(key, value);
      }
      app.save(record);
    }
  }
}, (app) => {
  const ids = SEED_PLANTS.map((p) => p.catalogId);
  for (const catalogId of ids) {
    const records = app.findAllRecords("plants", $dbx.hashExp({ catalogId: catalogId }));
    for (const record of records) {
      app.delete(record);
    }
  }
});
