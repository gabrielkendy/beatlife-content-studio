// Supabase Configuration
const SUPABASE_URL = 'https://gpqxqykgcrpmvwxktjvp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjMxNTMsImV4cCI6MjA4MjczOTE1M30.v1WbmTecfEEW7g_-NI1uYP0sxIZxquv3rZPQ83a-nKI';

// Export for use in app.js
window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
};
