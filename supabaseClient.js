console.log("🔥 supabaseClient.js LOADED");

const SUPABASE_URL = "https://zophxtwisykqfhkfgmbp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcGh4dHdpc3lrcWZoa2ZnbWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDc4ODIsImV4cCI6MjA5MTgyMzg4Mn0.NKPSa_G_X6k4g954w_8_3apWK93iJ1Q5tK0uCXXVqrA";

// create ONE global instance
window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);