/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_225224730")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "json_round_categories",
    "maxSize": 0,
    "name": "categories",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_225224730")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "json_round_categories",
    "maxSize": 0,
    "name": "categories",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
})
