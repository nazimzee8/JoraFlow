// /backend/edge/parse-inbox.ts
// Supabase Edge Function template (Deno)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateSenderDomain, verifyWafHeaders, assertHttps } from '../services/security/EdgeGuardrails.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const RATE_LIMIT_PER_MIN = 5;
const rateLimit = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimit.get(userId);
  if (!entry || now - entry.windowStart > 60_000) {
    rateLimit.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_PER_MIN) {
    const retryAfter = 60 - Math.floor((now - entry.windowStart) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(retryAfter, 1) };
  }
  entry.count += 1;
  return { allowed: true };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // WAF header checks
  const waf = verifyWafHeaders(req.headers);
  if (!waf.ok) {
    return Response.json({ error: 'waf_blocked' }, { status: 403 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const rl = checkRateLimit(userId);
  if (!rl.allowed) {
    return Response.json({ error: 'rate_limited', retry_after_seconds: rl.retryAfterSeconds }, { status: 429 });
  }

  const body = await req.json();
  const { days, sender_domain } = body;

  // DNS checks (example)
  if (sender_domain) {
    const risk = await validateSenderDomain(sender_domain);
    if (risk.risk === 'high') {
      return Response.json({ error: 'high_risk_sender' }, { status: 403 });
    }
  }

  // Example outbound enforcement
  assertHttps('https://gmail.googleapis.com');

  // TODO: invoke orchestrator + parsing pipeline
  return Response.json({ queued: true, job_count_estimate: 0 }, { status: 200 });
});
