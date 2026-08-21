/**
 * «Что зреет» — куда растёт приложение, человеческим языком.
 * Живая строка «Сейчас пишем» сверху, дальше: делаем / уже есть / потом.
 * Каждый пункт — название и одно предложение, понятное с телефона.
 */

type Status = 'doing' | 'done' | 'later' | 'gone'

/** Что прямо сейчас происходит в мастерской — одна честная фраза. */
const NOW_WRITING =
  'Пишем карточку растения по-настоящему полезной: история фото, состояние по снимку, простой уход и заметки — всё в одном месте.'

interface Item {
  status: Status
  /** Для «уже есть» — момент готовности, для остальных — порядок. */
  at: string
  emoji: string
  title: string
  text: string
}

const ITEMS: Item[] = [
  {
    status: 'doing',
    at: '2026-08-21T19:50:00Z',
    emoji: '📖',
    title: 'Карточка растения — всё в одном месте',
    text: 'Фото за все годы, состояние по последнему снимку, когда поливали и ваши заметки — открыли и сразу видно.',
  },
  {
    status: 'doing',
    at: '2026-08-21T19:49:00Z',
    emoji: '🔍',
    title: 'Фото рассказывает больше',
    text: 'Снимок подскажет не только название: сорт, как себя чувствует растение и что ему сейчас нужно.',
  },
  {
    status: 'done',
    at: '2026-08-21T19:45:00Z',
    emoji: '🧭',
    title: 'Стартовая схема — при создании участка',
    text: 'Съёмка по точкам сама открывается у нового участка; из меню плана лишний пункт убрали.',
  },
  {
    status: 'done',
    at: '2026-08-21T18:54:00Z',
    emoji: '🪄',
    title: 'Растение с фото заполняется само',
    text: 'Сняли цветок — приложение само пишет название и вид, а вам остаётся коснуться места на плане.',
  },
  {
    status: 'later',
    at: '2026-08-21T18:20:00Z',
    emoji: '💧',
    title: 'Сад напомнит про полив',
    text: 'Откроете приложение — и видно, какие растения давно без воды и кто первый в очереди на лейку.',
  },
  {
    status: 'later',
    at: '2026-08-21T18:20:00Z',
    emoji: '🍂',
    title: 'Дела до холодов',
    text: 'Короткий список к осени: что укрыть, что обрезать, что успеть пересадить.',
  },
  {
    status: 'later',
    at: '2026-08-21T18:20:00Z',
    emoji: '🔗',
    title: 'Показать сад друзьям',
    text: 'Отправляете ссылку — друзья видят план и фото, но поменять ничего не могут.',
  },
  {
    status: 'done',
    at: '2026-08-21T18:00:00Z',
    emoji: '🧭',
    title: 'Стартовая схема с фото — по-новому',
    text: 'Приложение подсказывает, откуда снять участок; прошлись, сняли — план нарисовался сам, без вопросов.',
  },
  {
    status: 'gone',
    at: '2026-08-21T19:45:00Z',
    emoji: '📸',
    title: 'Прогулка с фотоаппаратом',
    text: 'Убрали: серия снимков вслепую путала растения. Вместо неё — «сфотографировать и посадить» по одному и стартовая схема у нового участка.',
  },
  {
    status: 'done',
    at: '2026-08-21T15:23:00Z',
    emoji: '🛠️',
    title: 'Исправление догадки по растению',
    text: 'Если приложение ошиблось, в карточке посадки выбираете другое растение или создаёте новое.',
  },
  {
    status: 'done',
    at: '2026-08-21T14:31:00Z',
    emoji: '📷',
    title: 'Фото одним касанием',
    text: 'Кнопка с фотоаппаратом прямо в фотоленте: сняли, выбрали растение — снимок уже в журнале.',
  },
  {
    status: 'done',
    at: '2026-08-21T14:31:00Z',
    emoji: '👨‍👩‍👧‍👦',
    title: 'Семейный сад',
    text: 'Один участок на несколько человек по приглашению email; видно, кто сделал запись или посадку.',
  },
  {
    status: 'done',
    at: '2026-08-21T14:05:00Z',
    emoji: '🖼️',
    title: 'Фотолента сада',
    text: 'Все снимки из журнала по месяцам; любой открывается во весь экран, подпись ведёт к записи.',
  },
  {
    status: 'done',
    at: '2026-08-21T13:32:00Z',
    emoji: '🌱',
    title: 'Посадка одним касанием',
    text: 'Кнопка с фотоаппаратом на плане: сняли цветок, коснулись места — растение на плане, фото в журнале.',
  },
  {
    status: 'done',
    at: '2026-08-21T12:58:00Z',
    emoji: '✏️',
    title: 'Свободные формы на плане',
    text: 'Дом поворачивается как стоит на самом деле, а клумбе и пруду форму задаёте, потянув за точки.',
  },
  {
    status: 'done',
    at: '2026-08-21T12:10:00Z',
    emoji: '🗺️',
    title: 'План участка',
    text: 'Дом, клумбы, дорожки, деревья, пруд — рисуется пальцем на телефоне.',
  },
  {
    status: 'done',
    at: '2026-08-21T12:10:00Z',
    emoji: '🌷',
    title: 'Свои растения',
    text: 'Список с сортами и фотографиями; каждое растение стоит на своём месте на плане.',
  },
  {
    status: 'done',
    at: '2026-08-21T12:10:00Z',
    emoji: '📖',
    title: 'Журнал сада',
    text: 'Полив, цветение, обрезка, подкормка, болезни, укрытие на зиму — всё с фото.',
  },
  {
    status: 'done',
    at: '2026-08-21T12:10:00Z',
    emoji: '📜',
    title: 'Память места',
    text: 'Видно, что росло на этой клумбе раньше и что с ним стало.',
  },
  {
    status: 'done',
    at: '2026-08-21T12:10:00Z',
    emoji: '📲',
    title: 'Значок на телефоне',
    text: 'Открывается как приложение, фотографии видны даже без сети.',
  },
]

const SECTIONS: { status: Status; heading: string }[] = [
  { status: 'doing', heading: 'Делаем' },
  { status: 'done', heading: 'Уже есть' },
  { status: 'later', heading: 'Потом' },
  { status: 'gone', heading: 'Убрали' },
]

const DONE_DATE = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function itemTime(item: Item): number {
  return Number.isFinite(Date.parse(item.at)) ? Date.parse(item.at) : 0
}

export default function RoadmapPage() {
  return (
    <div className="page">
      <div className="top-bar">
        <h1>Что зреет</h1>
      </div>

      <div className="roadmap-now">
        <span className="roadmap-now-dot" aria-hidden="true" />
        <div>
          <div className="roadmap-now-label">Сейчас пишем</div>
          <p className="roadmap-now-text">{NOW_WRITING}</p>
        </div>
      </div>

      {SECTIONS.filter(({ status }) => ITEMS.some((it) => it.status === status)).map(
        ({ status, heading }) => {
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
                      <div className="roadmap-title">{it.title}</div>
                      {it.status === 'done' && (
                        <div className="roadmap-date">сделано {DONE_DATE.format(new Date(it.at))}</div>
                      )}
                      <p className="roadmap-lines">{it.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        },
      )}
      <p className="muted" style={{ textAlign: 'center' }}>
        Сад растёт медленно, но каждый год — заметно.
      </p>
    </div>
  )
}
