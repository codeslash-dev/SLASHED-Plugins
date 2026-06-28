/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deflateSync, inflateSync } from "fflate";
import tokensData from "../data/token-registry.generated.json";

declare const __SLASHED_VERSION__: string;

const Wa = tokensData; // The token id registry — append-only map of name → numeric id
const Ki: string = typeof __SLASHED_VERSION__ !== "undefined" ? __SLASHED_VERSION__ : "0.0.0";

const Na = 65535;
const Pa = new TextEncoder();
const Fa = new TextDecoder("utf-8", { fatal: false });
const Ia = 65535;
const MAX_COMPRESSED_BYTES = 32 * 1024;
const MAX_DECOMPRESSED_BYTES = 256 * 1024;

function La(e: number): boolean {
  return Number.isInteger(e) && e >= 0 && e <= Ia;
}

function Ra(e: any): Map<string, number> {
  const t = new Map<string, number>();
  for (const n of e?.tokens ?? []) {
    if (n && !n.removed && typeof n.name === "string" && La(n.id)) {
      t.set(n.name, n.id);
    }
  }
  return t;
}

function za(e: any): Map<number, string> {
  const t = new Map<number, string>();
  for (const n of e?.tokens ?? []) {
    if (n && typeof n.name === "string" && Number.isInteger(n.id)) {
      t.set(n.id, n.name);
    }
  }
  return t;
}

function Ba(e: Uint8Array): string {
  let t = "";
  for (let n = 0; n < e.length; n++) {
    t += String.fromCharCode(e[n]);
  }
  return btoa(t)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function Va(e: string): Uint8Array | null {
  try {
    let t = e.replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4) {
      t += "=";
    }
    const decoded = atob(t);
    const n = new Uint8Array(decoded.length);
    for (let t = 0; t < decoded.length; t++) {
      n[t] = decoded.charCodeAt(t);
    }
    return n;
  } catch {
    return null;
  }
}

export function Ha(e: Record<string, string>, t: any = Wa): string {
  if (!e || typeof e !== "object") return "";
  const n = Ra(t);
  const r: { id: number; valueBytes: Uint8Array }[] = [];

  for (const [key, val] of Object.entries(e)) {
    if (typeof key !== "string" || typeof val !== "string" || val === "") continue;
    const id = n.get(key);
    if (id === undefined) continue;
    const valueBytes = Pa.encode(val);
    if (valueBytes.length > Na) continue;
    r.push({ id, valueBytes });
  }

  if (r.length === 0) return "";
  r.sort((a, b) => a.id - b.id);

  let payloadLen = 0;
  for (const item of r) payloadLen += 4 + item.valueBytes.length;

  const payload = new Uint8Array(payloadLen);
  let o = 0;
  for (const { id, valueBytes } of r) {
    payload[o++] = (id >> 8) & 255;
    payload[o++] = id & 255;
    payload[o++] = (valueBytes.length >> 8) & 255;
    payload[o++] = valueBytes.length & 255;
    payload.set(valueBytes, o);
    o += valueBytes.length;
  }

  const compressed = deflateSync(payload);
  if (compressed.length > MAX_COMPRESSED_BYTES) {
    console.warn(`[codec] compressed payload too large (${compressed.length} B > ${MAX_COMPRESSED_BYTES} B); refusing to encode.`);
    return "";
  }
  const out = new Uint8Array(1 + compressed.length);
  out[0] = 2;
  out.set(compressed, 1);
  return Ba(out);
}

export function Ua(e: string, t: any = Wa, n: any = {}): Record<string, string> {
  const r = String(e ?? "").trim();
  if (r === "") return {};
  const rawBytes = Va(r);
  if (!rawBytes || rawBytes.length === 0) return {};

  if (rawBytes[0] !== 2) {
    console.warn(`[codec] unknown config-code version ${rawBytes[0]} (expected 2); ignoring.`);
    return {};
  }

  const compressedLen = rawBytes.length - 1;
  if (compressedLen > MAX_COMPRESSED_BYTES) {
    console.warn(`[codec] compressed payload too large (${compressedLen} B > ${MAX_COMPRESSED_BYTES} B); ignoring.`);
    return {};
  }

  let i: Uint8Array;
  try {
    i = inflateSync(rawBytes.subarray(1));
  } catch {
    console.warn("[codec] failed to decompress config; ignoring.");
    return {};
  }
  if (!i || i.length === 0) return {};
  if (i.length > MAX_DECOMPRESSED_BYTES) {
    console.warn(`[codec] decompressed payload too large (${i.length} B > ${MAX_DECOMPRESSED_BYTES} B); ignoring.`);
    return {};
  }

  const a = za(t);
  const sanitize = typeof n.sanitize === "function" ? n.sanitize : (val: string) => val;
  const isKnown = typeof n.isKnown === "function" ? n.isKnown : () => true;
  const c: Record<string, string> = {};
  let l = 0;
  
  try {
    while (l < i.length) {
      if (l + 4 > i.length) throw new Error("truncated entry header");
      const id = (i[l] << 8) | i[l + 1];
      const valLen = (i[l + 2] << 8) | i[l + 3];
      l += 4;
      if (l + valLen > i.length) throw new Error("truncated value");
      const decodedVal = Fa.decode(i.subarray(l, l + valLen));
      l += valLen;
      
      const tokenName = a.get(id);
      if (tokenName === undefined || !isKnown(tokenName)) continue;
      const sanitizedVal = sanitize(decodedVal);
      if (sanitizedVal !== "") {
        c[tokenName] = sanitizedVal;
      }
    }
  } catch (err: any) {
    console.warn(`[codec] malformed config code; ignoring (${err.message}).`);
    return {};
  }
  
  return c;
}

export function da(e: string | null | undefined): string {
  return e == null
    ? ""
    : String(e)
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/[;{}]/g, " ")
        .replace(/[/*]{2,}/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function fa(e: Record<string, string>, t: { mode?: "layer" | "root"; banner?: boolean } = {}): string {
  const { mode = "layer", banner = true } = t;
  const i = Object.keys(e).sort((a, b) => a.localeCompare(b));
  if (i.length === 0) return "";
  
  const a = i.map((key) => `${key}: ${da(e[key])};`);
  const o = mode === "layer" ? "\t\t" : "\t";
  const s = a.map((val) => `${o}${val}`).join("\n");
  let c = "";
  
  if (banner) {
    c += `/* SLASHED override tokens v${Ki} — generated by the SLASHED configurator.\n   Load this AFTER the SLASHED stylesheet. ${i.length} token${i.length === 1 ? "" : "s"} customised. */\n`;
  }
  
  return mode === "layer"
    ? `${c}@layer slashed.overrides {\n\t:root {\n${s}\n\t}\n}\n`
    : `${c}:root {\n${s}\n}\n`;
}

export function pa(e: string): Record<string, string> {
  const t: Record<string, string> = {};
  if (!e) return t;
  const n = e.replace(/\/\*[\s\S]*?\*\//g, "");
  const r = /(--sf-[\w-]+)\s*:/g;
  let i;
  
  while ((i = r.exec(n)) !== null) {
    const key = i[1];
    let index = i.index + i[0].length;
    let parenCount = 0;
    let quoteChar = "";
    let accumulatedValue = "";
    
    for (; index < n.length; index++) {
      const char = n[index];
      if (quoteChar) {
        if (char === quoteChar && n[index - 1] !== "\\") {
          quoteChar = "";
        }
      } else if (char === '"' || char === "'") {
        quoteChar = char;
      } else if (char === "(") {
        parenCount++;
      } else if (char === ")") {
        parenCount--;
      } else if ((char === ";" || char === "}") && parenCount === 0) {
        break;
      }
      accumulatedValue += char;
    }
    
    const trimmedVal = accumulatedValue.replace(/\s+/g, " ").trim();
    if (trimmedVal !== "") {
      t[key] = trimmedVal;
    }
    r.lastIndex = index;
  }
  
  return t;
}

export function Ga(e: Record<string, string>): string {
  return Ha(e, Wa);
}

export function Ka(e: string, t: any = {}): Record<string, string> {
  const knownTokensSet = new Set(Wa.tokens.map((tok: any) => tok.name));
  const isKnown = t.isKnown ?? ((name: string) => knownTokensSet.has(name));
  let r = String(e ?? "").trim();
  const i = r.match(/[#&]?c=([^&]+)/);
  if (i) {
    r = i[1];
  }
  return Ua(r, Wa, { sanitize: da, isKnown });
}

export function qa(e: Record<string, string>, t?: string): string {
  const fallbackUrl = typeof window !== "undefined" ? window.location.href : "https://example.com/";
  const baseUrl = t ?? fallbackUrl;
  const r = new URL(baseUrl);
  const code = Ga(e);
  r.hash = code ? `c=${code}` : "";
  return r.toString();
}

export function Ja(e: string, t: any = {}): Record<string, string> {
  const n = String(e ?? "");
  return n.includes("c=") ? Ka(n, t) : {};
}

// Named aliases for tests and external consumers
export const encode = Ha;
export const decode = Ua;
export const sanitizeValue = da;
export const generateCSS = fa;
export const parseCSS = pa;
export const encodeOverrides = Ga;
export const buildShareUrl = qa;
export const readShareFromHash = Ka;
export const CODEC_VERSION = 2;
export const SHARE_PARAM = "c";
