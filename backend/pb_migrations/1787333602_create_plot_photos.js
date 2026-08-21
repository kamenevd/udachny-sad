/// <reference path="../pb_data/types.d.ts" />
// Фото стартовой прогулки по участку: снимки с точек съёмки.
// Доступ семейный — как у объектов плана (владелец участка и участники).
migrate((app) => {
  const plots = app.findCollectionByNameOrId("plots")

  // Правила ниже ссылаются на plot.members — добавим поле, если его ещё нет
  // (свежая база из снапшота участников не знает).
  const hasMembers = plots.fields.find((f) => f.name === "members")
  if (!hasMembers) {
    plots.fields.add(new Field({
      name: "members",
      type: "relation",
      collectionId: "_pb_users_auth_",
      maxSelect: 50,
    }))
    app.save(plots)
  }

  try {
    app.findCollectionByNameOrId("plot_photos")
    return null // уже есть
  } catch (e) {
    // создаём ниже
  }

  const rule = "plot.owner = @request.auth.id || plot.members ?= @request.auth.id"

  const collection = new Collection({
    name: "plot_photos",
    type: "base",
    fields: [
      {
        name: "plot",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        collectionId: plots.id,
      },
      { name: "point", type: "text", max: 40 },
      { name: "label", type: "text", max: 120 },
      {
        name: "photo",
        type: "file",
        required: true,
        maxSelect: 1,
        maxSize: 10485760,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
        thumbs: ["100x100", "400x400", "800x0"],
      },
      { name: "author_email", type: "text", max: 255 },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    listRule: rule,
    viewRule: rule,
    createRule: '@request.auth.id != "" && (' + rule + ")",
    updateRule: rule,
    deleteRule: rule,
  })

  return app.save(collection)
}, (app) => {
  let collection
  try {
    collection = app.findCollectionByNameOrId("plot_photos")
  } catch (e) {
    return null
  }
  return app.delete(collection)
})
