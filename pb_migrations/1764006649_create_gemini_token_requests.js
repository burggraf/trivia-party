/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // Resolve collection IDs dynamically
  const usersCollection = app.findCollectionByNameOrId("users");
  if (!usersCollection) {
    throw new Error("users collection not found");
  }

  const gamesCollection = app.findCollectionByNameOrId("games");
  if (!gamesCollection) {
    throw new Error("games collection not found");
  }

  const collection = new Collection({
    name: "gemini_token_requests",
    type: "base",
    system: false,
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text3208210256",
        max: 15,
        min: 15,
        name: "id",
        pattern: "^[a-z0-9]+$",
        presentable: false,
        primaryKey: true,
        required: true,
        system: true,
        type: "text"
      },
      {
        cascadeDelete: true,
        collectionId: usersCollection.id,
        hidden: false,
        id: "relation_user",
        maxSelect: 1,
        minSelect: 1,
        name: "user",
        presentable: false,
        required: true,
        system: false,
        type: "relation"
      },
      {
        hidden: false,
        id: "text_ip_address",
        max: 45,
        min: 0,
        name: "ip_address",
        presentable: false,
        required: false,
        system: false,
        type: "text"
      },
      {
        cascadeDelete: true,
        collectionId: gamesCollection.id,
        hidden: false,
        id: "relation_game",
        maxSelect: 1,
        minSelect: 0,
        name: "game",
        presentable: false,
        required: false,
        system: false,
        type: "relation"
      },
      {
        hidden: false,
        id: "bool_success",
        name: "success",
        presentable: false,
        required: true,
        system: false,
        type: "bool"
      },
      {
        hidden: false,
        id: "text_error_message",
        max: 500,
        min: 0,
        name: "error_message",
        presentable: false,
        required: false,
        system: false,
        type: "text"
      },
      {
        hidden: false,
        id: "autodate2990389176",
        name: "created",
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: "autodate"
      },
      {
        hidden: false,
        id: "autodate3332085495",
        name: "updated",
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
        type: "autodate"
      }
    ],
    indexes: [
      "CREATE INDEX `idx_token_requests_user_created` ON `gemini_token_requests` (`user`, `created`)",
      "CREATE INDEX `idx_token_requests_created` ON `gemini_token_requests` (`created`)"
    ],
    listRule: "@request.auth.id != '' && user.id = @request.auth.id",
    viewRule: "@request.auth.id != '' && user.id = @request.auth.id",
    createRule: null, // Only server can create
    updateRule: null,
    deleteRule: null
  });

  return app.save(collection);
}, (app) => {
  // Rollback: delete collection
  const collection = app.findCollectionByNameOrId("gemini_token_requests");
  if (collection) {
    return app.delete(collection);
  }
});
