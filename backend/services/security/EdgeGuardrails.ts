// /backend/services/security/EdgeGuardrails.ts
// Deno-compatible utilities for Supabase Edge Functions.

export type DomainRisk = {
  domain: string;
  risk: 'low' | 'high';
  reasons: string[];
};

export async function validateSenderDomain(domain: string): Promise<DomainRisk> {
  const reasons: string[] = [];

  const mx = await resolveMx(domain);
  if (!mx) reasons.push('mx_missing');

  const spf = await hasSpf(domain);
  if (!spf) reasons.push('spf_missing');

  const dmarc = await hasDmarc(domain);
  if (!dmarc) reasons.push('dmarc_missing');

  return {
    domain,
    risk: reasons.length ? 'high' : 'low',
    reasons,
  };
}

export function verifyWafHeaders(headers: Headers): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const threatScore = headers.get('x-waf-threat-score');
  const geoIp = headers.get('x-waf-geo-ip');
  const reqId = headers.get('x-waf-request-id');

  if (!threatScore) warnings.push('missing_threat_score');
  if (!geoIp) warnings.push('missing_geo_ip');
  if (!reqId) warnings.push('missing_request_id');

  if (threatScore && Number(threatScore) >= 80) {
    return { ok: false, warnings: ['high_threat_score'] };
  }

  return { ok: warnings.length === 0, warnings };
}

export function assertHttps(url: string): void {
  if (!url.startsWith('https://')) {
    throw new Error('Outbound requests must use HTTPS.');
  }
}

async function resolveMx(domain: string): Promise<boolean> {
  try {
    const records = await Deno.resolveDns(domain, 'MX');
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
}

async function hasSpf(domain: string): Promise<boolean> {
  try {
    const records = await Deno.resolveDns(domain, 'TXT');
    return records.some(r => typeof r === 'string' && r.toLowerCase().includes('v=spf1'));
  } catch {
    return false;
  }
}

async function hasDmarc(domain: string): Promise<boolean> {
  try {
    const records = await Deno.resolveDns(`_dmarc.${domain}`, 'TXT');
    return records.some(r => typeof r === 'string' && r.toLowerCase().includes('v=dmarc1'));
  } catch {
    return false;
  }
}
