import { StateManager } from './durable-object.js';

export { StateManager };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // All API requests go to the Durable Object
    if (url.pathname.startsWith('/api/') || url.pathname === '/ws') {
      const id = env.STATE.idFromName('chore-state');
      const obj = env.STATE.get(id);
      const response = await obj.fetch(request);

      // Add CORS headers to response
      const newResponse = new Response(response.body, response);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
      });
      return newResponse;
    }

    // Other requests return 404
    return new Response('Not Found', { status: 404 });
  }
};
