/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // Resolve collection IDs dynamically
  const usersCollection = app.findCollectionByNameOrId("users");
  if (!usersCollection) {
    throw new Error("users collection not found");
  }

  const collection = new Collection({
    name: "user_bans",
    type: "base",
    system: false,
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text3208210257",
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
        id: "text_reason",
        max: 500,
        min: 1,
        name: "reason",
        presentable: false,
        required: true,
        system: false,
        type: "text"
      },
      {
        hidden: false,
        id: "date_banned_until",
        max: "",
        min: "",
        name: "banned_until",
        presentable: false,
        required: false,
        system: false,
        type: "date"
      },
      {
        hidden: false,
        id: "bool_permanent",
        name: "permanent",
        presentable: false,
        required: true,
        system: false,
        type: "bool"
      },
      {
        cascadeDelete: false,
        collectionId: usersCollection.id,
        hidden: false,
        id: "relation_banned_by",
        maxSelect: 1,
        minSelect: 0,
        name: "banned_by",
        presentable: false,
        required: false,
        system: false,
        type: "relation"
      },
      {
        hidden: false,
        id: "autodate2990389177",
        name: "created",
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: "autodate"
      },
      {
        hidden: false,
        id: "autodate3332085496",
        name: "updated",
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
        type: "autodate"
      }
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_user_bans_user` ON `user_bans` (`user`)",
      "CREATE INDEX `idx_user_bans_banned_until` ON `user_bans` (`banned_until`)"
    ],
    listRule: null, // Only admins
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null
  });

  return app.save(collection);
}, (app) => {
  // Rollback: delete collection
  const collection = app.findCollectionByNameOrId("user_bans");
  if (collection) {
    return app.delete(collection);
  }
});
