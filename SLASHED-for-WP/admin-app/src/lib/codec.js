/**
 * Shareable config CODEC — a compact, future-proof binary encoding for an
 * override map (token name → value), modelled on Guild Wars 2's build-template
 * codes.
 *
 * Instead of embedding token *names* in the link, each token carries a
 * permanent 16-bit numeric id from token-registry.json. A config is a sparse
 * list of `(id, value)` pairs packed into a byte buffer, then base64url'd into
 * a single URL-fragment token. This is:
 *   - compact (ids, not names), and
 *   - future-proof by construction: unknown ids are skipped on decode and
 *     missing ids fall back to defaults, so a code minted today keeps working
 *     in every later build (the registry only ever appends).
 *
 * This module is deliberately self-contained — no Svelte, no configurator
 * model imports — so the SLASHED WordPress plugin can vendor it verbatim and
 * build the same codes client-side. The configurator wraps it in share.js,
 * injecting the registry, the value sanitizer and the known-token check.
 *
 * Binary format (schema version 1):
 *   byte 0      : schema version (0x01) — guards byte-encoding changes only,
 *                 NOT token add/remove (the id registry handles those).
 *   per token (sparse, only non-default tokens):
 *     bytes 0-1 : token id,   uint16 big-endian
 *     bytes 2-3 : value length, uint16 big-endian (UTF-8 byte count)
 *     bytes 4-N : value, UTF-8 bytes
 *   The buffer is base64url-encoded with no padding.
 *   An empty map encodes to '' so callers can treat "nothing to share"
 *   uniformly.
 */

/** Current binary schema version. Bump only on a byte-layout change. */
export const CODEC_VERSION = 1;
/** Max value byte length the 16-bit length prefix can address. */
const MAX_VALUE_BYTES = 0xffff;

const _enc = new TextEncoder();
const _dec = new TextDecoder('utf-8', { fatal: false });

/** Inclusive upper bound of the 2-byte (uint16) id field on the wire. */
const MAX_ID = 0xffff;

/** True when `id` fits the 2-byte wire field (0..65535) without truncation. */
function isWireId(id) {
  return Number.isInteger(id) && id >= 0 && id <= MAX_ID;
}

/**
 * Build a `name -> id` map from a parsed token-registry.json, skipping entries
 * flagged `removed` (their ids must never be re-emitted). Ids outside the
 * uint16 wire range are dropped rather than silently truncated on encode — an
 * out-of-range id would otherwise alias a different token after the high bits
 * are masked off. (The generator caps the id space, so this is belt-and-braces.)
 * @param {{ tokens: Array<{id:number,name:string,removed?:boolean}> }} registry
 * @returns {Map<string, number>}
 */
function nameToId(registry) {
  const map = new Map();
  for (const t of registry?.tokens ?? []) {
    if (t && !t.removed && typeof t.name === 'string' && isWireId(t.id)) {
      map.set(t.name, t.id);
    }
  }
  return map;
}

/**
 * Build an `id -> name` map from a parsed token-registry.json. Removed entries
 * are retained so a stale code referencing a retired id resolves to its old
 * name (and is then dropped by the caller's known-token check) rather than
 * silently colliding with a newer token.
 * @param {{ tokens: Array<{id:number,name:string,removed?:boolean}> }} registry
 * @returns {Map<number, string>}
 */
function idToName(registry) {
  const map = new Map();
  for (const t of registry?.tokens ?? []) {
    if (t && typeof t.name === 'string' && Number.isInteger(t.id)) map.set(t.id, t.name);
  }
  return map;
}

/**
 * base64url-encode a byte array, with no `=` padding (URL-fragment safe).
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = (typeof btoa === 'function'
    ? btoa(bin)
    : Buffer.from(bytes).toString('base64'));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a base64url string (padding optional) back to bytes. Returns null on
 * any malformed input rather than throwing.
 * @param {string} str
 * @returns {Uint8Array|null}
 */
function fromBase64Url(str) {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    if (typeof atob === 'function') {
      const bin = atob(b64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    return new Uint8Array(Buffer.from(b64, 'base64'));
  } catch {
    return null;
  }
}

/**
 * Encode an override map into a base64url config code.
 *
 * Entries with a non-string key/value, an empty value, or a token whose name is
 * not in the registry (or is flagged removed) are dropped. An empty result
 * encodes to ''.
 *
 * @param {Record<string, string>} map token name -> value
 * @param {{ tokens: Array<{id:number,name:string,removed?:boolean}> }} registry
 * @returns {string} base64url code, or '' when there is nothing to encode
 */
export function encode(map, registry) {
  if (!map || typeof map !== 'object') return '';
  const ids = nameToId(registry);

  // Collect encodable (id, valueBytes) pairs, sorted by id for a stable,
  // deterministic code (same config → same string regardless of key order).
  const parts = [];
  for (const [name, value] of Object.entries(map)) {
    if (typeof name !== 'string' || typeof value !== 'string' || value === '') continue;
    const id = ids.get(name);
    if (id === undefined) continue;
    const valueBytes = _enc.encode(value);
    if (valueBytes.length > MAX_VALUE_BYTES) continue; // unrepresentable; skip
    parts.push({ id, valueBytes });
  }
  if (parts.length === 0) return '';
  parts.sort((a, b) => a.id - b.id);

  // Size the buffer: 1 version byte + per entry (2 id + 2 length + N value).
  let size = 1;
  for (const p of parts) size += 4 + p.valueBytes.length;
  const buf = new Uint8Array(size);

  let o = 0;
  buf[o++] = CODEC_VERSION;
  for (const { id, valueBytes } of parts) {
    buf[o++] = (id >> 8) & 0xff;
    buf[o++] = id & 0xff;
    buf[o++] = (valueBytes.length >> 8) & 0xff;
    buf[o++] = valueBytes.length & 0xff;
    buf.set(valueBytes, o);
    o += valueBytes.length;
  }
  return toBase64Url(buf);
}

/**
 * Decode a config code back into an override map. Tolerant by design: any
 * malformed, truncated or unknown-version input returns `{}` (with a single
 * console.warn) rather than throwing, so a broken link degrades to "open with
 * defaults".
 *
 * Unknown ids (minted by a newer registry, or retired) are silently skipped.
 * Each decoded value is passed through `opts.sanitize` (if given) and the token
 * is kept only if `opts.isKnown` (if given) accepts its name.
 *
 * @param {string} str base64url code (no surrounding `#c=` — caller strips it)
 * @param {{ tokens: Array<{id:number,name:string,removed?:boolean}> }} registry
 * @param {{ sanitize?: (v: string) => string, isKnown?: (name: string) => boolean }} [opts]
 * @returns {Record<string, string>}
 */
export function decode(str, registry, opts = {}) {
  const raw = String(str ?? '').trim();
  if (raw === '') return {};

  const bytes = fromBase64Url(raw);
  if (!bytes || bytes.length === 0) return {};

  if (bytes[0] !== CODEC_VERSION) {
    console.warn(`[codec] unknown config-code version ${bytes[0]} (expected ${CODEC_VERSION}); ignoring.`);
    return {};
  }

  const names = idToName(registry);
  const sanitize = typeof opts.sanitize === 'function' ? opts.sanitize : (v) => v;
  const isKnown = typeof opts.isKnown === 'function' ? opts.isKnown : () => true;

  const out = {};
  let o = 1;
  try {
    while (o < bytes.length) {
      // Need at least the 4-byte header for the next entry.
      if (o + 4 > bytes.length) throw new Error('truncated entry header');
      const id = (bytes[o] << 8) | bytes[o + 1];
      const len = (bytes[o + 2] << 8) | bytes[o + 3];
      o += 4;
      if (o + len > bytes.length) throw new Error('truncated value');
      const value = _dec.decode(bytes.subarray(o, o + len));
      o += len;

      const name = names.get(id);
      if (name === undefined) continue; // unknown id → skip (forward-compat)
      if (!isKnown(name)) continue; // retired/unknown token → drop
      const safe = sanitize(value);
      if (safe !== '') out[name] = safe;
    }
  } catch (err) {
    console.warn(`[codec] malformed config code; ignoring (${err.message}).`);
    return {};
  }
  return out;
}
