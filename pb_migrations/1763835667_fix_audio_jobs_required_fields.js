/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("audio_generation_jobs");

  if (!collection) {
    throw new Error("audio_generation_jobs collection not found");
  }

  // Update number fields to make them not required
  // (PocketBase treats 0 as "blank" for required number fields)

  // Find and update progress field
  const progressField = collection.fields.find((f) => f.name === "progress");
  if (progressField) {
    progressField.required = false;
  }

  // Find and update total_questions field
  const totalQuestionsField = collection.fields.find((f) => f.name === "total_questions");
  if (totalQuestionsField) {
    totalQuestionsField.required = false;
  }

  // Find and update processed_questions field
  const processedQuestionsField = collection.fields.find((f) => f.name === "processed_questions");
  if (processedQuestionsField) {
    processedQuestionsField.required = false;
  }

  // Find and update current_api_key_index field
  const apiKeyIndexField = collection.fields.find((f) => f.name === "current_api_key_index");
  if (apiKeyIndexField) {
    apiKeyIndexField.required = false;
  }

  return app.save(collection);
}, (app) => {
  // Rollback: restore required=true for number fields
  const collection = app.findCollectionByNameOrId("audio_generation_jobs");

  if (!collection) {
    return;
  }

  const progressField = collection.fields.find((f) => f.name === "progress");
  if (progressField) {
    progressField.required = true;
  }

  const totalQuestionsField = collection.fields.find((f) => f.name === "total_questions");
  if (totalQuestionsField) {
    totalQuestionsField.required = true;
  }

  const processedQuestionsField = collection.fields.find((f) => f.name === "processed_questions");
  if (processedQuestionsField) {
    processedQuestionsField.required = true;
  }

  const apiKeyIndexField = collection.fields.find((f) => f.name === "current_api_key_index");
  if (apiKeyIndexField) {
    apiKeyIndexField.required = true;
  }

  return app.save(collection);
});
