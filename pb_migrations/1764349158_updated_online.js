/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2837562276")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != '' && player = @request.auth.id",
    "deleteRule": "player = @request.auth.id",
    "listRule": "@request.auth.id != ''",
    "updateRule": "player = @request.auth.id",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2837562276")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": "",
    "listRule": "",
    "updateRule": "",
    "viewRule": ""
  }, collection)

  return app.save(collection)
})
