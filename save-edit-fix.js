// BOUNDS save/edit guard.
// Isolated in an IIFE so its constants can never collide with another script instance.
(() => {
  const BOUNDS_SUPABASE_URL = 'https://ynlncjnjnbujzfjsfdwb.supabase.co';
  const BOUNDS_SUPABASE_KEY = 'sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
  const BOUNDS_SESSION_KEY = 'bounds_supabase_session';
  const BOUNDS_DRAFT_KEY = 'bounds_v1_draft';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const nativeFetch = window.fetch.bind(window);

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  async function findExistingRound(clientRoundId) {
    const session = readJson(BOUNDS_SESSION_KEY);
    if (!session?.access_token || !UUID.test(clientRoundId)) return null;

    const query = new URLSearchParams({
      select: 'id,played_at',
      client_round_id: `eq.${clientRoundId}`,
      limit: '1'
    });

    try {
      const response = await nativeFetch(
        `${BOUNDS_SUPABASE_URL}/rest/v1/rounds?${query}`,
        {
          headers: {
            apikey: BOUNDS_SUPABASE_KEY,
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );
      if (!response.ok) return null;
      const rows = await response.json();
      return Array.isArray(rows) && rows[0] ? rows[0] : null;
    } catch {
      return null;
    }
  }

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input?.url || '');
    const isSave = /\/rest\/v1\/rpc\/save_round_v[12](?:\?|$)/.test(url);
    if (!isSave) return nativeFetch(input, init);

    let payload = null;
    try {
      payload = JSON.parse(init?.body || '{}');
    } catch {
      return nativeFetch(input, init);
    }
    if (!payload) return nativeFetch(input, init);

    const draft = readJson(BOUNDS_DRAFT_KEY);
    if (
      !UUID.test(String(payload.p_client_round_id || '')) &&
      UUID.test(String(draft?.clientRoundId || ''))
    ) {
      payload.p_client_round_id = draft.clientRoundId;
    }

    if (UUID.test(String(payload.p_client_round_id || ''))) {
      const existing = await findExistingRound(payload.p_client_round_id);
      if (existing?.played_at) payload.p_played_at = existing.played_at;
    }

    return nativeFetch(input, {
      ...init,
      body: JSON.stringify(payload)
    });
  };
})();
