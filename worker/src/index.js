import { StateManager } from './durable-object.js';

export { StateManager };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // SMS endpoint for reward notifications
    if (url.pathname === '/api/send-sms' && request.method === 'POST') {
      return handleSendSms(request, env);
    }

    // All other API requests go to the Durable Object
    if (url.pathname.startsWith('/api/') || url.pathname === '/ws') {
      const id = env.STATE.idFromName('chore-state');
      const obj = env.STATE.get(id);
      return obj.fetch(request);
    }

    // Other requests return 404
    return new Response('Not Found', { status: 404 });
  }
};

async function handleSendSms(request, env) {
  try {
    const body = await request.json();
    const { rewardName } = body;

    // Twilio credentials from environment
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const fromNumber = env.TWILIO_FROM_NUMBER;
    const toNumber = env.TWILIO_TO_NUMBER;

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
      return new Response(JSON.stringify({ error: 'SMS credentials not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build Twilio API request
    const auth = btoa(`${accountSid}:${authToken}`);
    const message = `🎉 Logan unlocked a reward: "${rewardName}"`;

    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', toNumber);
    formData.append('Body', message);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: 'Failed to send SMS', details: errorText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();
    return new Response(JSON.stringify({ success: true, messageSid: result.sid }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'SMS request failed', details: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
