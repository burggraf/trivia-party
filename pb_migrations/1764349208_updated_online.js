/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2837562276")

  // update collection data
  unmarshal({
    "listRule": "player = @request.auth.id || @collection.games.host ?= @request.auth.id && @collection.games.id ?= game",
    "viewRule": "player = @request.auth.id || @collection.games.host ?= @request.auth.id && @collection.games.id ?= game"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2837562276")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
})
