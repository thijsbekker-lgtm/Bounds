// BOUNDS Supabase adapter.
// Deterministic browser adapter for GitHub Pages.
export function createBoundsSupabase(url, anonKey) {
  const REST = `${url}/rest/v1`;
  const AUTH = `${url}/auth/v1`;
  const SESSION_KEY = 'bounds_supabase_session';
  const SYNC_KEY = 'bounds_v1_sync_queue';

  const readSession = () => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  };

  const writeSession = (session) => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  };

  const readQueue = () => {
    try {
      const q = JSON.parse(localStorage.getItem(SYNC_KEY) || '[]');
      return Array.isArray(q) ? q : [];
    } catch {
      return [];
    }
  };

  const writeQueue = (queue) => {
    localStorage.setItem(SYNC_KEY, JSON.stringify(queue));
  };

  const result = (data, error = null) => ({ data, error });

  const isNetworkError = (error) => {
    const msg = String(error?.message || '');
    return !navigator.onLine ||
      error?.name === 'TypeError' ||
      error?.name === 'AbortError' ||
      error?.name === 'TimeoutError' ||
      error?.status === 408 ||
      error?.status === 504 ||
      /Failed to fetch|NetworkError|Load failed|network|timed? ?out|timeout|aborted/i.test(msg);
  };

  async function request(base, path = '', options = {}) {
    const session = readSession();
    const headers = {
      apikey: anonKey,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };

    if (session?.access_token && !options.skipSessionAuth) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${base}${path}`, {
      ...options,
      headers
    });

    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!response.ok) {
      const error = new Error(
        body?.msg || body?.message || body?.error_description || body?.error || text || `HTTP ${response.status}`
      );
      error.status = response.status;
      error.code = body?.code;
      throw error;
    }

    return body;
  }

  async function flushQueue() {
    const queue = readQueue();
    if (!queue.length || !navigator.onLine) return;

    let firstUnprocessed = queue.length;
    for (let i = 0; i < queue.length; i += 1) {
      const item = queue[i];
      try {
        await request(REST, `/rpc/${item.name}`, {
          method: 'POST',
          body: JSON.stringify(item.payload)
        });
      } catch (error) {
        if (isNetworkError(error)) {
          firstUnprocessed = i;
          break;
        }
        console.error('BOUNDS sync item rejected', error);
      }
    }

    if (firstUnprocessed < queue.length) {
      writeQueue(queue.slice(firstUnprocessed));
    } else {
      writeQueue([]);
    }
  }

  class Query {
    constructor(table) {
      this.table = table;
      this.params = [];
      this.method = 'GET';
      this.body = null;
      this.headers = {};
      this.mode = null;
    }

    select(columns = '*') {
      this.params.push(['select', columns]);
      return this;
    }

    eq(column, value) {
      this.params.push([column, `eq.${value}`]);
      return this;
    }

    in(column, values) {
      this.params.push([column, `in.(${(values || []).join(',')})`]);
      return this;
    }

    order(column, { ascending = true } = {}) {
      this.params.push(['order', `${column}.${ascending ? 'asc' : 'desc'}`]);
      return this;
    }

    limit(count) {
      this.params.push(['limit', String(count)]);
      return this;
    }

    maybeSingle() {
      this.mode = 'maybe';
      return this;
    }

    single() {
      this.mode = 'single';
      return this;
    }

    insert(payload) {
      this.method = 'POST';
      this.body = payload;
      this.headers.Prefer = 'return=representation';
      return this;
    }

    then(resolve, reject) {
      return this.execute().then(resolve, reject);
    }

    catch(reject) {
      return this.execute().catch(reject);
    }

    async execute() {
      try {
        let path = `/${this.table}`;

        if (this.method === 'POST') {
          const data = await request(REST, path, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(this.body)
          });
          const value = this.mode
            ? (Array.isArray(data) ? (data[0] || null) : data)
            : data;

          if (this.mode === 'single' && !value) {
            return result(null, new Error('Geen record gevonden.'));
          }
          return result(value);
        }

        const query = new URLSearchParams(this.params);
        if (query.toString()) path += `?${query}`;
        const data = await request(REST, path);

        if (this.mode === 'single') {
          if (Array.isArray(data) && data.length === 1) return result(data[0]);
          return result(null, new Error(
            Array.isArray(data) && data.length === 0
              ? 'Geen record gevonden.'
              : 'Meerdere records gevonden.'
          ));
        }

        if (this.mode === 'maybe') {
          return result(Array.isArray(data) ? (data[0] || null) : (data || null));
        }

        return result(data || []);
      } catch (error) {
        return result(null, error);
      }
    }
  }

  const listeners = new Set();

  const auth = {
    async getSession() {
      let session = readSession();
      if (!session) return result({ session: null });

      if (
        session.expires_at &&
        Date.now() / 1000 > Number(session.expires_at) - 30 &&
        session.refresh_token
      ) {
        try {
          const refreshed = await request(AUTH, '/token?grant_type=refresh_token', {
            method: 'POST',
            skipSessionAuth: true,
            body: JSON.stringify({ refresh_token: session.refresh_token })
          });
          session = {
            ...session,
            ...refreshed,
            expires_at: Math.floor(Date.now() / 1000) + Number(refreshed.expires_in || 3600)
          };
          writeSession(session);
        } catch {
          writeSession(null);
          session = null;
          listeners.forEach((listener) => listener('SIGNED_OUT', null));
        }
      }

      return result({ session });
    },

    onAuthStateChange(listener) {
      listeners.add(listener);
      return {
        data: {
          subscription: {
            unsubscribe: () => listeners.delete(listener)
          }
        }
      };
    },

    async signInWithPassword({ email, password }) {
      try {
        const data = await request(AUTH, '/token?grant_type=password', {
          method: 'POST',
          skipSessionAuth: true,
          body: JSON.stringify({ email, password })
        });
        const session = {
          ...data,
          expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)
        };
        writeSession(session);
        listeners.forEach((listener) => listener('SIGNED_IN', session));
        return result({ session, user: data.user });
      } catch (error) {
        return result({ session: null }, error);
      }
    },

    async signUp({ email, password }) {
      try {
        const data = await request(AUTH, '/signup', {
          method: 'POST',
          skipSessionAuth: true,
          body: JSON.stringify({ email, password })
        });

        let session = null;
        if (data?.access_token) {
          session = {
            ...data,
            expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)
          };
          writeSession(session);
          listeners.forEach((listener) => listener('SIGNED_IN', session));
        }

        return result({ session, user: data?.user || null });
      } catch (error) {
        return result({ session: null }, error);
      }
    },

    async signOut() {
      const session = readSession();
      try {
        if (session?.access_token) {
          await request(AUTH, '/logout', { method: 'POST' });
        }
      } catch {
        // Local logout must still succeed if the remote logout request fails.
      }
      writeSession(null);
      listeners.forEach((listener) => listener('SIGNED_OUT', null));
      return result(null);
    }
  };

  window.addEventListener('online', () => flushQueue());
  setTimeout(() => flushQueue(), 0);

  return {
    auth,
    from: (table) => new Query(table),
    rpc: async (name, payload = {}) => {
      try {
        const data = await request(REST, `/rpc/${name}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        return result(data);
      } catch (error) {
        if (name === 'save_round_v2' && isNetworkError(error)) {
          const queue = readQueue();
          const clientRoundId = payload?.p_client_round_id;
          const existingIndex = clientRoundId
            ? queue.findIndex(
                (item) => item.name === name && item.payload?.p_client_round_id === clientRoundId
              )
            : -1;
          const item = {
            name,
            payload,
            queued_at: new Date().toISOString()
          };

          if (existingIndex >= 0) queue[existingIndex] = item;
          else queue.push(item);
          writeQueue(queue);

          return result({
            queued: true,
            client_round_id: clientRoundId || null
          });
        }
        return result(null, error);
      }
    }
  };
}
