/// <reference path="../pb_data/types.d.ts" />

// Load Google Service Account credentials into PocketBase settings on startup
onBootstrap((e) => {
  // Try to load from environment variable
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (credentialsJson) {
    console.log('[GoogleCreds] Loading Service Account credentials from environment variable');

    try {
      // Validate it's valid JSON
      JSON.parse(credentialsJson);
      console.log('[GoogleCreds] ✅ Credentials validated and loaded into environment');
      // Note: The hook will read from process.env.GOOGLE_SERVICE_ACCOUNT_JSON directly
    } catch (err) {
      console.error('[GoogleCreds] ❌ Failed to parse credentials JSON:', err);
    }
  } else {
    console.warn('[GoogleCreds] ⚠️  No Google Service Account credentials found');
    console.warn('[GoogleCreds]    Set GOOGLE_SERVICE_ACCOUNT_JSON environment variable');
  }

  // Continue bootstrap process
  e.next();
});
