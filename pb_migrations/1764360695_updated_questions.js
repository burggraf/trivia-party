/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_questions_collection")

  // remove field
  collection.fields.removeById("text1234567899")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_questions_collection")

  // add field
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1234567899",
    "max": 100,
    "min": 0,
    "name": "level",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
