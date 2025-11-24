/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3728988662")

  // update field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "select2363381545",
    "maxSelect": 1,
    "name": "type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "game_start",
      "round_start",
      "question_start",
      "question_end",
      "answer_reveal",
      "scores_update",
      "round_end",
      "game_end"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3728988662")

  // update field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "select2363381545",
    "maxSelect": 1,
    "name": "type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "game_start",
      "round_start",
      "question_presented",
      "team_buzzed",
      "answer_revealed",
      "answer_correct",
      "answer_wrong",
      "round_end",
      "game_end"
    ]
  }))

  return app.save(collection)
})
