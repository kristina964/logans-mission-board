import { StateManager } from './durable-object.js';

export { StateManager };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // All API requests go to the Durable Object
    if (url.pathname.startsWith('/api/') || url.pathname === '/ws') {
      const id = env.STATE.idFromName('chore-state');
      const obj = env.STATE.get(id);
      return obj.fetch(request);
    }

    // Other requests return 404
    return new Response('Not Found', { status: 404 });
  }
};
