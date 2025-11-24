#!/usr/bin/env node

// Test if Google Service Account credentials are properly configured
// Usage: node scripts/test-google-credentials.js

const fs = require('fs');
const path = require('path');

console.log('Testing Google Service Account Credentials...\n');

// Try to load from .env file first
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ Found .env file');
  const envContent = fs.readFileSync(envPath, 'utf8');

  // Extract GOOGLE_SERVICE_ACCOUNT_JSON value
  const match = envContent.match(/GOOGLE_SERVICE_ACCOUNT_JSON='([^']*)'/);
  if (match) {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = match[1];
    console.log('✅ Loaded GOOGLE_SERVICE_ACCOUNT_JSON from .env\n');
  } else {
    console.log('⚠️  .env file exists but GOOGLE_SERVICE_ACCOUNT_JSON not found\n');
  }
}

const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!credentials) {
  console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON not set');
  console.error('\nPlease run:');
  console.error('  ./scripts/setup-google-credentials.sh /path/to/your-key.json');
  process.exit(1);
}

try {
  const parsed = JSON.parse(credentials);

  console.log('✅ Credentials loaded successfully\n');
  console.log('📋 Credential Details:');
  console.log('   Project ID:', parsed.project_id || '❌ Missing');
  console.log('   Client Email:', parsed.client_email || '❌ Missing');
  console.log('   Private Key ID:', parsed.private_key_id ? parsed.private_key_id.substring(0, 8) + '...' : '❌ Missing');
  console.log('   Private Key:', parsed.private_key ? '✅ Present (' + parsed.private_key.length + ' chars)' : '❌ Missing');
  console.log('   Type:', parsed.type || '❌ Missing');

  // Validate required fields
  const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
  const missingFields = requiredFields.filter(field => !parsed[field]);

  if (missingFields.length > 0) {
    console.error('\n❌ Missing required fields:', missingFields.join(', '));
    process.exit(1);
  }

  if (parsed.type !== 'service_account') {
    console.error('\n❌ Invalid type. Expected "service_account", got:', parsed.type);
    process.exit(1);
  }

  console.log('\n✅ All required fields present');
  console.log('✅ Credentials are valid');
  console.log('\n🎉 Setup complete! PocketBase should be able to use these credentials.');

} catch (err) {
  console.error('❌ Failed to parse credentials:', err.message);
  console.error('\nThe GOOGLE_SERVICE_ACCOUNT_JSON value is not valid JSON.');
  console.error('Please check that the entire JSON was copied correctly.');
  process.exit(1);
}
