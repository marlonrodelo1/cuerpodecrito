/**
 * supabase-client.js — Cliente Supabase singleton para toda la app
 * Depende de: window.supabase (Supabase JS SDK cargado vía CDN antes que este archivo)
 */
(function SupabaseClientModule() {
  'use strict';

  const SUPABASE_URL  = 'https://zbcpvwdzvjymyhsypmih.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiY3B2d2R6dmp5bXloc3lwbWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTg0NzksImV4cCI6MjA4OTc5NDQ3OX0._qtYHkrpJ3FNaqhMbcCDWZOzz609eG8I3G-xNMuaBpU';

  let client = null;

  function getClient() {
    if (!client) {
      if (!window.supabase) {
        console.error('Supabase SDK no cargado. Asegúrate de incluir el script CDN antes de supabase-client.js');
        return null;
      }
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return client;
  }

  window.SupabaseClient = {
    get client() { return getClient(); },
    SUPABASE_URL,
    SUPABASE_ANON
  };

})();
