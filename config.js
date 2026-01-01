// Supabase Configuration
const SUPABASE_URL = 'https://gpqxqykgcrpmvwxktjvp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjMxNTMsImV4cCI6MjA4MjczOTE1M30.v1WbmTecfEEW7g_-NI1uYP0sxIZxquv3rZPQ83a-nKI';

// Storage key (para uploads)
const SUPABASE_STORAGE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18';

// Export for use in app.js
window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    storageKey: SUPABASE_STORAGE_KEY
};
