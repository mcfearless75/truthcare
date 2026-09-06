/**
 * Microsoft Graph client (spec §6.1). Lifted from TrakNet's lib/email.js and
 * the poll in lib/handlers/tickets/cron.js, with three deliberate changes:
 *
 *   1. The app token is cached in module scope until 60 s before expiry.
 *   2. listMessages reads MAILBOX_ADDRESS (infotech@) by receivedDateTime
 *      cursor — there is NO isRead PATCH anywhere in this service, so humans
 *      reading infotech@ see no side effects.
 *   3. sendMail posts to /users/<MAILBOX_ADDRESS>/sendMail with
 *      from = TICKETS_ADDRESS (the alias) and saveToSentItems:false.
 *
 * GRAPH_BASE_URL / MS_LOGIN_BASE_URL are test-only overrides for the fake
 * Graph server in tests/integration/email-flow.test.js.
 */
import { env, requireEnv, mailboxAddress, ticketsAddress } from './config.js';

export const TOKEN_EARLY_REFRESH_MS = 60 * 1000;
export const MESSAGE_SELECT = 'id,internetMessageId,subject,from,toRecipients,ccRecipients,body,receivedDateTime,hasAttachments,conversationId,internetMessageHeaders';
export const FROM_NAME = 'Truth Care Tickets';

let cache = { token: null, expiresAt: 0 };

export function resetTokenCache() {
  cache = { token: null, expiresAt: 0 };
}

export function graphBase() {
  return env('GRAPH_BASE_URL', 'https://graph.microsoft.com/v1.0').replace(/\/+$/, '');
}

export function loginBase() {
  return env('MS_LOGIN_BASE_URL', 'https://login.microsoftonline.com').replace(/\/+$/, '');
}

/** Client-credentials token, cached until 60 s before Graph says it expires. */
export async function getGraphToken({ now = Date.now() } = {}) {
  if (cache.token && now < cache.expiresAt) return cache.token;
  const tenantId = requireEnv('MICROSOFT_TENANT_ID');
  const clientId = requireEnv('MICROSOFT_CLIENT_ID');
  const clientSecret = requireEnv('MICROSOFT_CLIENT_SECRET');

  const res = await fetch(`${loginBase()}/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Graph auth failed: ${data.error_description || data.error || res.status}`);
  }
  const ttlMs = (Number(data.expires_in) || 3600) * 1000;
  cache = { token: data.access_token, expiresAt: now + ttlMs - TOKEN_EARLY_REFRESH_MS };
  return cache.token;
}

async function graphRequest(path, { method = 'GET', body, headers = {} } = {}) {
  const token = await getGraphToken();
  const res = await fetch(`${graphBase()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Graph ${method} ${path} failed ${res.status}: ${text.slice(0, 500)}`);
  }
  if (res.status === 202 || res.status === 204) return null;
  return res.json();
}

const userPath = () => `/users/${encodeURIComponent(mailboxAddress())}`;

/**
 * Messages received on or after `since` (Date | ISO string | ms), oldest first.
 * Single page: the poller caps at 20 per run and advances its cursor, so any
 * remainder is picked up by the next run.
 */
export async function listMessages({ since, top = 50 }) {
  const iso = new Date(since).toISOString();
  const query = [
    `$filter=${encodeURIComponent(`receivedDateTime ge ${iso}`)}`,
    `$select=${encodeURIComponent(MESSAGE_SELECT)}`,
    `$top=${top}`,
    `$orderby=${encodeURIComponent('receivedDateTime asc')}`,
  ].join('&');
  const data = await graphRequest(`${userPath()}/messages?${query}`, { headers: { Prefer: 'outlook.body-content-type="text"' } });
  return Array.isArray(data?.value) ? data.value : [];
}

const recipient = (address) => ({ emailAddress: { address: String(address).trim() } });

/**
 * Send as the tickets@ alias through the infotech@ mailbox. Requires the
 * tenant setting Set-OrganizationConfig -SendFromAliasEnabled $true (spec §10).
 */
export async function sendMail({ to, cc = [], subject, html, text = '', replyTo }) {
  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean).map(recipient);
  if (!toList.length) throw new Error('sendMail: no recipients');
  const ccList = (Array.isArray(cc) ? cc : [cc]).filter(Boolean).map(recipient);
  const message = {
    subject,
    from: { emailAddress: { address: ticketsAddress(), name: FROM_NAME } },
    toRecipients: toList,
    ...(ccList.length ? { ccRecipients: ccList } : {}),
    body: { contentType: 'HTML', content: html },
    ...(text ? { bodyPreview: text.slice(0, 255) } : {}),
    ...(replyTo ? { replyTo: [recipient(replyTo)] } : {}),
  };
  await graphRequest(`${userPath()}/sendMail`, { method: 'POST', body: { message, saveToSentItems: false } });
}

/** HTML → text that keeps line structure, because commands are parsed per line. */
export function stripHtml(html) {
  return String(html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote|pre|table)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 8000);
}

/** Plain text of a Graph message body whichever content type came back. */
export function messageBodyText(message) {
  const body = message?.body || {};
  const content = String(body.content || '');
  if (String(body.contentType || '').toLowerCase() === 'text') return content.replace(/\r\n?/g, '\n').trim().slice(0, 8000);
  return stripHtml(content);
}
