/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3728988662")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE INDEX `idx_w92TWsZumO` ON `game_events` (\n  `game`,\n  `created`\n)",
      "CREATE INDEX `idx_a7EwUI2hnO` ON `game_events` (`type`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3728988662")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
