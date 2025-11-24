/// <reference path="../pb_data/types.d.ts" />

// API endpoint: POST /api/gemini/session-token
// Returns the Google Cloud API key for Gemini Live API access
routerAdd("POST", "/api/gemini/session-token", (e) => {
  // Configuration
  const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const RATE_LIMIT_MAX_REQUESTS = 2; // Max 2 tokens per 5 minutes
  const DAILY_LIMIT_MAX_REQUESTS = 50; // Max 50 tokens per day

  const authRecord = e.auth;

  if (!authRecord) {
    return e.json(403, { error: "Authentication required" });
  }

  const userId = authRecord.id;
  const ipAddress = e.request.header.get("X-Real-IP") || e.request.header.get("X-Forwarded-For") || "unknown";

  // Get optional game ID from request body
  let gameId = null;
  try {
    const body = readerToString(e.request.body);
    if (body) {
      const data = JSON.parse(body);
      gameId = data.game_id || null;
    }
  } catch (err) {
    // Ignore parse errors, gameId stays null
  }

  // Helper: Log token request
  function logTokenRequest(success, errorMessage) {
    try {
      const collection = e.app.findCollectionByNameOrId("gemini_token_requests");
      const record = new Record(collection);

      record.set("user", userId);
      record.set("ip_address", ipAddress || "");
      if (gameId) {
        record.set("game", gameId);
      }
      record.set("success", success);
      record.set("error_message", errorMessage || "");

      e.app.save(record);
    } catch (err) {
      console.error('[GeminiToken] Failed to log request:', err);
    }
  }

  try {
    // Check if user is banned
    try {
      const now = new Date().toISOString();
      const bans = e.app.findRecordsByFilter(
        "user_bans",
        `user = {:userId} && (permanent = true || banned_until > {:now})`,
        "",
        1,
        0,
        {
          userId: userId,
          now: now
        }
      );

      if (bans.length > 0) {
        logTokenRequest(false, "User is banned");
        return e.json(403, {
          error: "Access denied",
          reason: "banned",
          message: "Your account has been banned from using the AI host feature."
        });
      }
    } catch (err) {
      console.error('[GeminiToken] Error checking ban status:', err);
    }

    // Check rate limits - 5 minute window
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
      const recentRequests = e.app.findRecordsByFilter(
        "gemini_token_requests",
        `user = {:userId} && created > {:windowStart}`,
        "",
        -1,
        0,
        {
          userId: userId,
          windowStart: windowStart.toISOString()
        }
      );

      if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
        logTokenRequest(false, "rate_limit_5min");
        return e.json(429, {
          error: "Rate limit exceeded",
          reason: "rate_limit_5min",
          message: `Rate limit exceeded. Max ${RATE_LIMIT_MAX_REQUESTS} requests per 5 minutes.`,
          retry_after: 300
        });
      }
    } catch (err) {
      console.error('[GeminiToken] Error checking 5-min rate limit:', err);
    }

    // Check rate limits - daily
    try {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dailyRequests = e.app.findRecordsByFilter(
        "gemini_token_requests",
        `user = {:userId} && created > {:dayStart}`,
        "",
        -1,
        0,
        {
          userId: userId,
          dayStart: dayStart.toISOString()
        }
      );

      if (dailyRequests.length >= DAILY_LIMIT_MAX_REQUESTS) {
        logTokenRequest(false, "daily_limit");
        return e.json(429, {
          error: "Rate limit exceeded",
          reason: "daily_limit",
          message: `Daily limit exceeded. Max ${DAILY_LIMIT_MAX_REQUESTS} requests per day.`,
          retry_after: 86400
        });
      }
    } catch (err) {
      console.error('[GeminiToken] Error checking daily limit:', err);
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

    if (!apiKey) {
      throw new Error("Google Cloud API key not configured");
    }

    // Log successful request
    logTokenRequest(true, null);

    console.log(`[GeminiToken] Issued API key to user ${userId} (IP: ${ipAddress})`);

    // Return the API key (it will be used as access_token in WebSocket URL with ?key= parameter)
    return e.json(200, {
      access_token: apiKey,
      token_type: "Bearer",
      expires_in: 86400 // 24 hours
    });

  } catch (err) {
    console.error("[GeminiToken] Error:", err);
    logTokenRequest(false, err.message);

    return e.json(500, {
      error: "Failed to get API key",
      message: err.message
    });
  }
});
