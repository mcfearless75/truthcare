/**
 * Post HMAC-signed Retell payloads at a local, preview or production /api/phone
 * so the phone door can be exercised without making a call (spec §9).
 *
 *   node scripts/simulate-call.js --url http://localhost:3000/api/phone --key $RETELL_API_KEY
 *   node scripts/simulate-call.js --url https://tickets.truthcaregroup.co.uk/api/phone --action lookup_ticket --ticket 42
 *   node scripts/simulate-call.js --dry            # print the signed requests, post nothing
 *
 * Flags: --url <base /api/phone>  --key <signing key, default RETELL_API_KEY env>
 *        --action create_ticket|lookup_ticket|webhook|all (default all)
 *        --ticket <number for lookup, default 1>  --phone <E.164, default +447700900123>  --dry
 */
import { signRetellBody } from '../lib/retell.js';

function parseArgs(argv) {
  const out = { url: 'http://localhost:3000/api/phone', key: (process.env.RETELL_API_KEY || '').trim(), action: 'all', ticket: '1', phone: '+447700900123', dry: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry') out.dry = true;
    else if (a.startsWith('--') && i + 1 < argv.length) out[a.slice(2)] = argv[++i];
  }
  return out;
}

export function samplePayloads({ phone, ticket, callId = `sim_${Date.now()}` }) {
  return {
    create_ticket: {
      name: 'create_ticket',
      args: {
        category: 'referral',
        caller_name: 'Sam Taylor',
        caller_phone: phone,
        caller_org: 'North Somerset Council',
        subject_person: 'Michael',
        summary: 'Social worker enquiring about a placement for a man in his forties following a road traffic collision. Currently in hospital, discharge planned within three weeks. Funding likely continuing healthcare.',
      },
      call: { call_id: callId, from_number: phone, to_number: '+441934000000', agent_id: 'agent_4d82b100b4d5daca406a5f317b' },
    },
    lookup_ticket: {
      name: 'lookup_ticket',
      args: { ticket_number: String(ticket) },
      call: { call_id: `${callId}_lookup`, from_number: phone, agent_id: 'agent_4d82b100b4d5daca406a5f317b' },
    },
    webhook: {
      event: 'call_analyzed',
      call: {
        call_id: callId,
        from_number: phone,
        agent_id: 'agent_4d82b100b4d5daca406a5f317b',
        transcript: 'Agent: Hello, you have reached Truth Care Group. I am an automated assistant taking messages while the office is busy.\nUser: Hi, it is Sam Taylor from North Somerset Council about a placement.\nAgent: Thank you Sam. Could I take the best number to call you back on?',
        call_analysis: { call_summary: 'Social worker Sam Taylor enquired about a placement for Michael following a road traffic collision; call-back requested.', user_sentiment: 'Neutral', call_successful: true },
      },
    },
  };
}

export function signedRequest(url, payload, key, at = Date.now()) {
  const body = JSON.stringify(payload);
  return { url, method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Retell-Signature': signRetellBody(body, key, at) }, body };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.key && !opts.dry) {
    console.error('No signing key: pass --key or set RETELL_API_KEY');
    process.exit(1);
  }
  const key = opts.key || 'dry-run-key';
  const payloads = samplePayloads(opts);
  const actions = opts.action === 'all' ? ['create_ticket', 'webhook', 'lookup_ticket'] : [opts.action];
  for (const action of actions) {
    if (!payloads[action]) { console.error(`Unknown action ${action}`); process.exit(1); }
    const sep = opts.url.includes('?') ? '&' : '?';
    const req = signedRequest(`${opts.url}${sep}action=${action}`, payloads[action], key);
    console.log(`\n→ POST ${req.url}`);
    console.log(`  X-Retell-Signature: ${req.headers['X-Retell-Signature']}`);
    console.log(`  ${req.body.slice(0, 200)}${req.body.length > 200 ? '…' : ''}`);
    if (opts.dry) continue;
    const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: req.body });
    const text = await res.text();
    console.log(`← ${res.status} ${text}`);
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').replace(/^.*\//, ''));
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
