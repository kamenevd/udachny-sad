type Status = 'done' | 'doing' | 'later'

const STATUS: Record<Status, { label: string; cls: string }> = {
  done: { label: 'уже есть', cls: 'roadmap-badge--done' },
  doing: { label: 'делаем', cls: 'roadmap-badge--doing' },
  later: { label: 'потом', cls: 'roadmap-badge--later' },
}

interface Item {
  status: Status
  emoji: string
  title: string
  lines: string[]
}

const ITEMS: Item[] = [
  {
    status: 'done',
    emoji: '🗺️',
    title: 'План участка',
    lines: ['Дом, клумбы, дорожки, деревья, пруд.', 'Рисуется пальцем на телефоне.'],
  },
  {
    status: 'done',
    emoji: '🌷',
    title: 'Свои растения',
    lines: ['Список с сортами и фотографиями.', 'Каждое растение стоит на своём месте на плане.'],
  },
  {
    status: 'done',
    emoji: '📖',
    title: 'Журнал сада',
    lines: [
      'Полив, цветение, обрезка, подкормка,',
      'болезни, укрытие на зиму — с фото.',
    ],
  },
  {
    status: 'done',
    emoji: '📜',
    title: 'Память места',
    lines: ['Что росло на этой клумбе раньше', 'и что с ним стало.'],
  },
  {
    status: 'done',
    emoji: '📲',
    title: 'Значок на телефоне',
    lines: ['Открывается как приложение.', 'Фотографии видны даже без сети.'],
  },
  {
    status: 'done',
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
    emoji: '👨‍👩‍👧‍👦',
    title: 'Семейный сад',
    lines: [
      'Один участок на несколько человек по приглашению email.',
      'Все видят общий план, добавляют посадки и ведут журнал.',
      'Видно, кто сделал запись или посадку; выход участника данные не удаляет.',
    ],
  },
  {
    status: 'later',
    emoji: '📸',
    title: 'Прогулка с фотоаппаратом',
    lines: [
      'Прошлись по саду и наснимали —',
      'приложение само расставит фотографии по плану',
      'и запишет растения. Рисовать руками не придётся.',
    ],
  },
]

const SECTIONS: { status: Status; heading: string }[] = [
  { status: 'done', heading: 'Уже есть' },
  { status: 'doing', heading: 'Делаем сейчас' },
  { status: 'later', heading: 'Потом' },
]

export default function RoadmapPage() {
  return (
    <div className="page">
      <div className="top-bar">
        <h1>Что будет</h1>
      </div>
      <p className="roadmap-intro">
        Куда растёт уДачный сад.
        <br />
        Без дат — как в саду: по готовности.
      </p>

      {SECTIONS
        .filter(({ status }) => ITEMS.some((it) => it.status === status))
        .map(({ status, heading }) => (
          <section key={status} className="roadmap-section">
            <h2 className="roadmap-heading">
              {heading}
              <span className={`roadmap-badge ${STATUS[status].cls}`}>{STATUS[status].label}</span>
            </h2>
            <div className="list">
              {ITEMS.filter((it) => it.status === status).map((it) => (
                <div key={it.title} className="roadmap-item">
                  <span className="roadmap-emoji">{it.emoji}</span>
                  <div>
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
        ))}
      <p className="muted" style={{ textAlign: 'center' }}>
        Сад растёт медленно, но каждый год — заметно.
      </p>
    </div>
  )
}
