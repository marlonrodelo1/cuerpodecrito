/**
 * auth.js — Módulo de autenticación con Supabase
 * Depende de: window.SupabaseClient
 */
(function AuthModule() {
  'use strict';

  function db() { return window.SupabaseClient.client; }

  // ─── Registro ─────────────────────────────────────────────────
  async function signUp(email, password, displayName) {
    const { data, error } = await db().auth.signUp({ email, password });
    if (error) throw error;
    // Actualizar nombre en perfil (el trigger ya creó la fila)
    if (data.user && displayName) {
      await db()
        .from('user_profiles')
        .update({ display_name: displayName })
        .eq('id', data.user.id);
    }
    return data;
  }

  // ─── Login ────────────────────────────────────────────────────
  async function signIn(email, password) {
    const { data, error } = await db().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  // ─── Logout ───────────────────────────────────────────────────
  async function signOut() {
    const { error } = await db().auth.signOut();
    if (error) throw error;
  }

  // ─── Estado ───────────────────────────────────────────────────
  function isLoggedIn() {
    // Supabase guarda la sesión en localStorage; getSession() es async,
    // pero podemos leer el cache sincrónico del storage
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!key) return false;
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return !!(data && data.access_token);
    } catch (_) { return false; }
  }

  function currentUser() {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!key) return null;
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return data?.user || null;
    } catch (_) { return null; }
  }

  // ─── Listener de cambios de auth ──────────────────────────────
  function onAuthStateChange(callback) {
    db().auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }

  // ─── Obtener perfil del usuario ───────────────────────────────
  async function getProfile() {
    const user = currentUser();
    if (!user) return null;
    const { data } = await db()
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    return data;
  }

  // ─── Actualizar perfil ────────────────────────────────────────
  async function updateProfile(fields) {
    const user = currentUser();
    if (!user) throw new Error('No autenticado');
    const { error } = await db()
      .from('user_profiles')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) throw error;
  }

  // ─── Subir avatar ─────────────────────────────────────────────
  async function uploadAvatar(file) {
    const user = currentUser();
    if (!user) throw new Error('No autenticado');
    const ext  = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await db().storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = db().storage.from('avatars').getPublicUrl(path);
    const avatarUrl = data.publicUrl;
    await updateProfile({ avatar_url: avatarUrl });
    return avatarUrl;
  }

  window.AuthModule = {
    signUp,
    signIn,
    signOut,
    isLoggedIn,
    currentUser,
    onAuthStateChange,
    getProfile,
    updateProfile,
    uploadAvatar
  };

})();
