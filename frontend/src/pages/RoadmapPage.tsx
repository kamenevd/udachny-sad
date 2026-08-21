type Status = 'planned' | 'doing' | 'done'

const STATUS: Record<Status, { label: string; cls: string }> = {
  planned: { label: 'в планах', cls: 'roadmap-badge--planned' },
  doing: { label: 'в работе', cls: 'roadmap-badge--doing' },
  done: { label: 'уже есть', cls: 'roadmap-badge--done' },
}

const STATUS_DATE_LABEL: Record<Status, string> = {
  planned: 'В планах с',
  doing: 'В работе с',
  done: 'Сделано',
}

interface Item {
  status: Status
  at: string
  emoji: string
  title: string
  lines: string[]
}

const ITEMS: Item[] = [
  {
    status: 'done',
    at: '2026-08-21T16:56:00Z',
    emoji: '🧭',
    title: 'Стартовая схема с фото',
    lines: [
      'По нескольким фотографиям участка собрали первый черновик:',
      'дом, дорожки, клумбы, деревья.',
      'Это первая настройка сада, не ежедневная прогулка.',
    ],
  },
  {
    status: 'planned',
    at: '2026-08-21T12:39:00Z',
    emoji: '🧠',
    title: 'Умнее угадывать растение с первого раза',
    lines: [
      'После прогулки понадобится меньше правок вручную —',
      'приложение точнее подскажет, что на фото.',
    ],
  },
  {
    status: 'done',
    at: '2026-08-21T15:23:00Z',
    emoji: '📸',
    title: 'Прогулка с фотоаппаратом',
    lines: [
      'Прошлись по саду и наснимали —',
      'приложение само расставит серию фото по плану,',
      'привяжет к отмеченным растениям и добавит новые.',
    ],
  },
  {
    status: 'done',
    at: '2026-08-21T15:23:00Z',
    emoji: '🛠️',
    title: 'Исправление догадки по растению',
    lines: [
      'Если приложение ошиблось после прогулки —',
      'в карточке посадки можно выбрать другое растение',
      'или создать новое прямо на месте.',
    ],
  },
  {
    status: 'done',
    at: '2026-08-21T14:31:00Z',
    emoji: '📷',
    title: 'Фото одним касанием',
    lines: [
      'Кнопка с фотоаппаратом прямо в фотоленте:',
      'сняли, выбрали растение —',
      'снимок уже в журнале.',
    ],
  },
  {
    status: 'done',
    at: '2026-08-21T14:31:00Z',
    emoji: '👨‍👩‍👧‍👦',
    title: 'Семейный сад',
    lines: [
      'Один участок на несколько человек по приглашению email.',
      'Все видят общий план, добавляют посадки и ведут журнал.',
      'Видно, кто сделал запись или посадку; выход участника данные не удаляет.',
    ],
  },
  {
    status: 'done',
    at: '2026-08-21T14:05:00Z',
    emoji: '🖼️',
    title: 'Фотолента сада',
    lines: [
      'Все снимки из журнала в одном месте —',
      'листаете по месяцам и видите, как рос сад.',
      'Любой снимок — во весь экран, подпись ведёт к записи.',
    ],
  },
  {
    status: 'done',
    at: '2026-08-21T13:32:00Z',
    emoji: '🌱',
    title: 'Посадка одним касанием',
    lines: [
      'Кнопка с фотоаппаратом прямо на плане:',
      'сняли цветок, написали название, коснулись места —',
      'растение на плане, фото уже в журнале.',
    ],
  },
  {
    status: 'done',
    at: '2026-08-21T12:58:00Z',
    emoji: '✏️',
    title: 'Свободные формы на плане',
    lines: [
      'Дом можно повернуть — как он стоит на самом деле.',
      'Клумбе, газону и пруду — придать любую форму:',
      'тяните за точки, добавляйте новые.',
    ],
  },
  {
    status: 'done',
    at: '2026-08-21T12:10:00Z',
    emoji: '🗺️',
    title: 'План участка',
    lines: ['Дом, клумбы, дорожки, деревья, пруд.', 'Рисуется пальцем на телефоне.'],
  },
  {
    status: 'done',
    at: '2026-08-21T12:10:00Z',
    emoji: '🌷',
    title: 'Свои растения',
    lines: ['Список с сортами и фотографиями.', 'Каждое растение стоит на своём месте на плане.'],
  },
  {
    status: 'done',
    at: '2026-08-21T12:10:00Z',
    emoji: '📖',
    title: 'Журнал сада',
    lines: [
      'Полив, цветение, обрезка, подкормка,',
      'болезни, укрытие на зиму — с фото.',
    ],
  },
  {
    status: 'done',
    at: '2026-08-21T12:10:00Z',
    emoji: '📜',
    title: 'Память места',
    lines: ['Что росло на этой клумбе раньше', 'и что с ним стало.'],
  },
  {
    status: 'done',
    at: '2026-08-21T12:10:00Z',
    emoji: '📲',
    title: 'Значок на телефоне',
    lines: ['Открывается как приложение.', 'Фотографии видны даже без сети.'],
  },
]

const SECTIONS: { status: Status; heading: string }[] = [
  { status: 'planned', heading: 'В планах' },
  { status: 'doing', heading: 'В работе' },
  { status: 'done', heading: 'Уже есть' },
]

const ROADMAP_DATE = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function itemTime(item: Item): number {
  return Number.isFinite(Date.parse(item.at)) ? Date.parse(item.at) : 0
}

function formatRoadmapDate(at: string): string {
  return ROADMAP_DATE.format(new Date(at))
}

export default function RoadmapPage() {
  return (
    <div className="page">
      <div className="top-bar">
        <h1>Что будет</h1>
      </div>
      <p className="roadmap-intro">
        В планах, в работе и уже сделанное.
        <br />
        Свежее сверху, для готовых пунктов — дата завершения.
      </p>

      {SECTIONS
        .filter(({ status }) => ITEMS.some((it) => it.status === status))
        .map(({ status, heading }) => {
          const sectionItems = ITEMS.filter((it) => it.status === status).sort(
            (a, b) => itemTime(b) - itemTime(a),
          )
          return (
            <section key={status} className="roadmap-section">
              <h2 className="roadmap-heading">{heading}</h2>
              <div className="list">
                {sectionItems.map((it) => (
                  <div key={it.title} className="roadmap-item">
                    <span className="roadmap-emoji">{it.emoji}</span>
                    <div>
                      <div className="roadmap-meta">
                        <span className={`roadmap-badge ${STATUS[it.status].cls}`}>
                          {STATUS[it.status].label}
                        </span>
                        <span className="roadmap-date">
                          {STATUS_DATE_LABEL[it.status]} {formatRoadmapDate(it.at)}
                        </span>
                      </div>
                      <div className="roadmap-title">{it.title}</div>
                      <p className="roadmap-lines">
                        {it.lines.map((l, i) => (
                          <span key={i}>
                            {l}
                            {i < it.lines.length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      <p className="muted" style={{ textAlign: 'center' }}>
        Сад растёт медленно, но каждый год — заметно.
      </p>
    </div>
  )
}
