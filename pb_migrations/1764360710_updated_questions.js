/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_questions_collection")

  // add field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "number2599078931",
    "max": null,
    "min": null,
    "name": "level",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_questions_collection")

  // remove field
  collection.fields.removeById("number2599078931")

  return app.save(collection)
})
