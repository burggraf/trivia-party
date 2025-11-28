/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3826546831")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != '' && player = @request.auth.id",
    "deleteRule": "player = @request.auth.id || host = @request.auth.id",
    "listRule": "host = @request.auth.id || player = @request.auth.id",
    "updateRule": "@request.auth.id != '' && player = @request.auth.id",
    "viewRule": "host = @request.auth.id || player = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3826546831")

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
