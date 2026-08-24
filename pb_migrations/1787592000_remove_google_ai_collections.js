/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  app.delete(app.findCollectionByNameOrId("gemini_token_requests"));
  app.delete(app.findCollectionByNameOrId("user_bans"));
}, () => {
  // Removed records cannot be restored by rolling back the schema migration.
});
