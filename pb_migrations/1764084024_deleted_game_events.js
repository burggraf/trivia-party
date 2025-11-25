/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3728988662");

  return app.delete(collection);
}, (app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != '' && game.host = @request.auth.id",
    "deleteRule": "@request.auth.id != '' && game.host = @request.auth.id",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_879072730",
        "hidden": false,
        "id": "relation590033292",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "game",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
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
      },
      {
        "hidden": false,
        "id": "number1378297592",
        "max": null,
        "min": 1,
        "name": "round_number",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number2446143580",
        "max": null,
        "min": 1,
        "name": "question_number",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_questions_collection",
        "hidden": false,
        "id": "relation3069659470",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "question",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1869854226",
        "hidden": false,
        "id": "relation498316904",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "game_question",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1514236743",
        "hidden": false,
        "id": "relation3303056927",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "team",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2411891325",
        "max": 100,
        "min": 0,
        "name": "team_name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3537423045",
        "max": 500,
        "min": 0,
        "name": "answer_given",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "json1326724116",
        "maxSize": 0,
        "name": "metadata",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_3728988662",
    "indexes": [
      "CREATE INDEX `idx_w92TWsZumO` ON `game_events` (\n  `game`,\n  `created`\n)",
      "CREATE INDEX `idx_a7EwUI2hnO` ON `game_events` (`type`)"
    ],
    "listRule": "@request.auth.id != ''",
    "name": "game_events",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "@request.auth.id != ''"
  });

  return app.save(collection);
})
