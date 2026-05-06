export class StateManager {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle WebSocket upgrade
    if (pathname === '/ws') {
      return this.handleWebSocket(request);
    }

    // GET /api/state/:weekKey
    if (pathname.startsWith('/api/state/') && request.method === 'GET') {
      const weekKey = pathname.split('/').pop();
      return this.getState(weekKey);
    }

    // POST /api/toggle/:choreId
    if (pathname.startsWith('/api/toggle/') && request.method === 'POST') {
      const choreId = pathname.split('/').pop();
      const kidId = url.searchParams.get('kidId');
      return this.toggleChore(choreId, kidId);
    }

    // POST /api/reset/:choreId
    if (pathname.startsWith('/api/reset/') && request.method === 'POST') {
      const choreId = pathname.split('/').pop();
      return this.resetChore(choreId);
    }

    return new Response('Not Found', { status: 404 });
  }

  async getState(weekKey) {
    const state = await this.state.get(weekKey) || {};
    return new Response(JSON.stringify(state), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async toggleChore(choreId, kidId) {
    const today = new Date();
    const weekKey = this.getWeekKey(today);
    const state = await this.state.get(weekKey) || {};

    // Toggle completion status
    state[choreId] = !state[choreId];

    await this.state.put(weekKey, state);
    this.broadcast({ choreId, completed: state[choreId] });

    return new Response(JSON.stringify({ choreId, completed: state[choreId] }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  async resetChore(choreId) {
    const today = new Date();
    const weekKey = this.getWeekKey(today);
    const state = await this.state.get(weekKey) || {};

    state[choreId] = false;
    await this.state.put(weekKey, state);
    this.broadcast({ choreId, completed: false });

    return new Response(JSON.stringify({ choreId, completed: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  handleWebSocket(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();
    this.sessions.add(server);

    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    for (const session of this.sessions) {
      try {
        session.send(data);
      } catch (e) {
        this.sessions.delete(session);
      }
    }
  }

  getWeekKey(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const dayStart = new Date(Date.UTC(yearStart.getUTCFullYear(), 0, 4));
    dayStart.setUTCDate(dayStart.getUTCDate() + 4 - (dayStart.getUTCDay() || 7));
    const weekNum = Math.round((d - dayStart) / 86400000 / 7) + 1;
    return `week_${d.getUTCFullYear()}_${weekNum}`;
  }
}
