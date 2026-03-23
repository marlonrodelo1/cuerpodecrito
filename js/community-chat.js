/**
 * community-chat.js — Chat de comunidad en tiempo real (Supabase Realtime)
 * Expone window.CommunityChat.init() y .destroy()
 */
(function CommunityChatModule() {
  'use strict';

  let channel     = null;
  let initialized = false;

  window.CommunityChat = { init, destroy };

  // ─── Init ──────────────────────────────────────────────────────────
  async function init() {
    if (initialized) return;
    initialized = true;

    renderInputBar();
    await loadMessages();
    subscribeRealtime();
  }

  // ─── Destroy ──────────────────────────────────────────────────────
  function destroy() {
    if (channel && window.SupabaseClient) {
      window.SupabaseClient.client.removeChannel(channel);
      channel = null;
    }
    initialized = false;
  }

  // ─── Cargar mensajes históricos ────────────────────────────────────
  async function loadMessages() {
    const loader = document.getElementById('chat-loader');
    if (!window.SupabaseClient) {
      if (loader) loader.remove();
      return;
    }

    try {
      const { data: messages } = await window.SupabaseClient.client
        .from('community_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(80);

      if (loader) loader.remove();

      const container = document.getElementById('chat-messages');
      if (!container) return;

      if (!messages || messages.length === 0) {
        container.innerHTML = `
          <div class="chat-empty">
            <div class="chat-empty-icon">💬</div>
            <div class="chat-empty-text">¡Sé el primero en escribir!<br>La comunidad te espera.</div>
          </div>`;
        return;
      }

      // Renderizar con separadores de fecha
      let lastDate = null;
      messages.forEach(msg => {
        const msgDate = msg.created_at.slice(0, 10);
        if (msgDate !== lastDate) {
          container.appendChild(createDateSeparator(msg.created_at));
          lastDate = msgDate;
        }
        container.appendChild(createBubble(msg));
      });

      scrollToBottom(container);
    } catch(err) {
      console.warn('Chat load error:', err);
      if (loader) loader.remove();
    }
  }

  // ─── Suscripción Realtime ──────────────────────────────────────────
  function subscribeRealtime() {
    if (!window.SupabaseClient) return;

    channel = window.SupabaseClient.client
      .channel('community')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_messages'
      }, payload => {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        // Eliminar empty state si existe
        const emptyEl = container.querySelector('.chat-empty');
        if (emptyEl) emptyEl.remove();
        container.appendChild(createBubble(payload.new));
        scrollToBottom(container);
      })
      .subscribe();
  }

  // ─── Input bar ────────────────────────────────────────────────────
  function renderInputBar() {
    const bar = document.getElementById('chat-input-bar');
    if (!bar) return;

    const loggedIn = window.AuthModule && window.AuthModule.isLoggedIn();

    if (loggedIn) {
      bar.innerHTML = `
        <div class="chat-input-row">
          <textarea class="chat-input" id="chat-input"
            placeholder="Escribe un mensaje para la comunidad..." rows="1" maxlength="500"></textarea>
          <button class="chat-send-btn" id="chat-send-btn">Enviar</button>
        </div>`;

      const input   = document.getElementById('chat-input');
      const sendBtn = document.getElementById('chat-send-btn');

      sendBtn.addEventListener('click', () => sendMessage(input));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(input);
        }
      });
      // Auto-resize textarea
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
    } else {
      bar.innerHTML = `
        <div class="chat-login-prompt">
          <span>¿Quieres participar?</span>
          <a href="login.html?redirect=index.html" class="btn btn-sm">Iniciar sesión</a>
        </div>`;
    }
  }

  // ─── Enviar mensaje ────────────────────────────────────────────────
  async function sendMessage(input) {
    const text = (input.value || '').trim();
    if (!text || !window.SupabaseClient) return;

    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const userId  = _getCurrentUserId();
      const profile = _getCachedProfile();
      const name    = profile?.display_name || 'Hermano/a';
      const avatar  = profile?.avatar_url || null;

      await window.SupabaseClient.client.from('community_messages').insert({
        user_id:      userId,
        display_name: name,
        avatar_url:   avatar,
        text
      });
      input.value = '';
      input.style.height = 'auto';
    } catch(err) {
      console.warn('Chat send error:', err);
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    }
  }

  // ─── Render helpers ───────────────────────────────────────────────
  function createBubble(msg) {
    const myId    = _getCurrentUserId();
    const isOwn   = msg.user_id === myId;
    const name    = msg.display_name || 'Anónimo';
    const initial = name.charAt(0).toUpperCase();
    const time    = _formatTime(msg.created_at);

    const div = document.createElement('div');
    div.className = 'chat-bubble' + (isOwn ? ' own' : '');

    let avatarHtml;
    if (msg.avatar_url) {
      avatarHtml = `<div class="chat-bubble-avatar"><img src="${_esc(msg.avatar_url)}" alt="${_esc(initial)}" loading="lazy"></div>`;
    } else {
      avatarHtml = `<div class="chat-bubble-avatar">${_esc(initial)}</div>`;
    }

    div.innerHTML = `
      ${avatarHtml}
      <div class="chat-bubble-content">
        <div class="chat-bubble-meta">
          <span class="chat-bubble-name">${_esc(name)}</span>
          <span class="chat-bubble-time">${time}</span>
        </div>
        <div class="chat-bubble-text">${_esc(msg.text)}</div>
      </div>`;
    return div;
  }

  function createDateSeparator(isoString) {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label;
    if (date.toDateString() === today.toDateString()) {
      label = 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Ayer';
    } else {
      label = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    }

    const div = document.createElement('div');
    div.className = 'chat-date-sep';
    div.textContent = label;
    return div;
  }

  function scrollToBottom(container) {
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
  }

  // ─── Utils ────────────────────────────────────────────────────────
  function _getCurrentUserId() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!keys.length) return null;
      return JSON.parse(localStorage.getItem(keys[0]))?.user?.id || null;
    } catch(_) { return null; }
  }

  function _getCachedProfile() {
    try { return JSON.parse(localStorage.getItem('cdc_profile') || 'null'); } catch(_) { return null; }
  }

  function _formatTime(isoString) {
    try {
      return new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch(_) { return ''; }
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
})();
