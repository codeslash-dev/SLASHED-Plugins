/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deflateSync, inflateSync } from "fflate";
import tokensData from "../data/token-registry.generated.json";
import type { TokenRegistry, DecodeOptions, ShareOptions } from "../types";

declare const __SLASHED_VERSION__: string;

const frameworkVersion: string = typeof __SLASHED_VERSION__ !== "undefined" ? __SLASHED_VERSION__ : "0.0.0";

export const CODEC_VERSION = 2;
export const SHARE_PARAM = "c";

// SL-026: MAX_VALUE_BYTES and MAX_ID happen to share the same value (both
// bounded by the 2-byte length-prefix / id field in the wire format — see
// encode()'s payload layout below) but are independent limits for unrelated
// things (a value's encoded byte length vs. a token's registry id). Don't
// assume changing one should change the other.
const MAX_VALUE_BYTES = 65535;
const MAX_ID = 65535;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: false });
const MAX_COMPRESSED_BYTES = 32 * 1024;
const MAX_DECOMPRESSED_BYTES = 256 * 1024;

function isValidId(id: number): boolean {
  return Number.isInteger(id) && id >= 0 && id <= MAX_ID;
}

function buildNameToIdMap(registry: TokenRegistry): Map<string, number> {
  const nameToId = new Map<string, number>();
  for (const entry of registry?.tokens ?? []) {
    if (entry && !entry.removed && typeof entry.name === "string" && isValidId(entry.id)) {
      nameToId.set(entry.name, entry.id);
    }
  }
  return nameToId;
}

function buildIdToNameMap(registry: TokenRegistry): Map<number, string> {
  const idToName = new Map<number, string>();
  for (const entry of registry?.tokens ?? []) {
    if (entry && typeof entry.name === "string" && Number.isInteger(entry.id)) {
      idToName.set(entry.id, entry.name);
    }
  }
  return idToName;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    let base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const decoded = atob(base64);
    const bytes = new Uint8Array(decoded.length);
    for (let j = 0; j < decoded.length; j++) {
      bytes[j] = decoded.charCodeAt(j);
    }
    return bytes;
  } catch {
    return null;
  }
}

export function encode(overrides: Record<string, string>, registry: TokenRegistry = tokensData): string {
  if (!overrides || typeof overrides !== "object") return "";
  const nameToId = buildNameToIdMap(registry);
  const entries: { id: number; valueBytes: Uint8Array }[] = [];

  for (const [key, val] of Object.entries(overrides)) {
    if (typeof key !== "string" || typeof val !== "string" || val === "") continue;
    const id = nameToId.get(key);
    if (id === undefined) continue;
    const valueBytes = textEncoder.encode(val);
    if (valueBytes.length > MAX_VALUE_BYTES) continue;
    entries.push({ id, valueBytes });
  }

  if (entries.length === 0) return "";
  entries.sort((a, b) => a.id - b.id);

  let payloadLen = 0;
  for (const item of entries) payloadLen += 4 + item.valueBytes.length;

  const payload = new Uint8Array(payloadLen);
  let offset = 0;
  for (const { id, valueBytes } of entries) {
    payload[offset++] = (id >> 8) & 255;
    payload[offset++] = id & 255;
    payload[offset++] = (valueBytes.length >> 8) & 255;
    payload[offset++] = valueBytes.length & 255;
    payload.set(valueBytes, offset);
    offset += valueBytes.length;
  }

  const compressed = deflateSync(payload);
  if (compressed.length > MAX_COMPRESSED_BYTES) {
    console.warn(`[codec] compressed payload too large (${compressed.length} B > ${MAX_COMPRESSED_BYTES} B); refusing to encode.`);
    return "";
  }
  const out = new Uint8Array(1 + compressed.length);
  out[0] = CODEC_VERSION;
  out.set(compressed, 1);
  return bytesToBase64Url(out);
}

export function decode(code: string, registry: TokenRegistry = tokensData, options: DecodeOptions = {}): Record<string, string> {
  const trimmed = String(code ?? "").trim();
  if (trimmed === "") return {};
  const rawBytes = base64UrlToBytes(trimmed);
  if (!rawBytes || rawBytes.length === 0) return {};

  if (rawBytes[0] !== CODEC_VERSION) {
    console.warn(`[codec] unknown config-code version ${rawBytes[0]} (expected ${CODEC_VERSION}); ignoring.`);
    return {};
  }

  const compressedLen = rawBytes.length - 1;
  if (compressedLen > MAX_COMPRESSED_BYTES) {
    console.warn(`[codec] compressed payload too large (${compressedLen} B > ${MAX_COMPRESSED_BYTES} B); ignoring.`);
    return {};
  }

  let decompressed: Uint8Array;
  try {
    decompressed = inflateSync(rawBytes.subarray(1));
  } catch {
    console.warn("[codec] failed to decompress config; ignoring.");
    return {};
  }
  if (!decompressed || decompressed.length === 0) return {};
  if (decompressed.length > MAX_DECOMPRESSED_BYTES) {
    console.warn(`[codec] decompressed payload too large (${decompressed.length} B > ${MAX_DECOMPRESSED_BYTES} B); ignoring.`);
    return {};
  }

  const idToName = buildIdToNameMap(registry);
  const sanitize = typeof options.sanitize === "function" ? options.sanitize : (val: string) => val;
  const isKnown = typeof options.isKnown === "function" ? options.isKnown : () => true;
  const result: Record<string, string> = {};
  let offset = 0;

  try {
    while (offset < decompressed.length) {
      if (offset + 4 > decompressed.length) throw new Error("truncated entry header");
      const id = (decompressed[offset] << 8) | decompressed[offset + 1];
      const valLen = (decompressed[offset + 2] << 8) | decompressed[offset + 3];
      offset += 4;
      if (offset + valLen > decompressed.length) throw new Error("truncated value");
      const decodedVal = textDecoder.decode(decompressed.subarray(offset, offset + valLen));
      offset += valLen;

      const tokenName = idToName.get(id);
      if (tokenName === undefined || !isKnown(tokenName)) continue;
      const sanitizedVal = sanitize(decodedVal);
      if (sanitizedVal !== "") {
        result[tokenName] = sanitizedVal;
      }
    }
  } catch (err: any) {
    console.warn(`[codec] malformed config code; ignoring (${err.message}).`);
    return {};
  }

  return result;
}

export function sanitizeValue(value: string | null | undefined): string {
  return value == null
    ? ""
    : String(value)
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/[;{}]/g, " ")
        .replace(/[/*]{2,}/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function generateCSS(overrides: Record<string, string>, options: { mode?: "layer" | "root"; banner?: boolean } = {}): string {
  const { mode = "layer", banner = true } = options;
  // Keys land here from several untrusted-ish entry points (imported JSON,
  // shared URL hash, localStorage, WP hydration) — unlike values, they were
  // never sanitized before being interpolated into the emitted CSS, so a
  // crafted key could break out of its declaration. Every real token name
  // (source or derived) is --sf-<word-chars/hyphens>; anything else is dropped.
  const keys = Object.keys(overrides).filter((key) => /^--sf-[\w-]+$/.test(key)).sort((a, b) => a.localeCompare(b));
  if (keys.length === 0) return "";

  const lines = keys.map((key) => `${key}: ${sanitizeValue(overrides[key])};`);
  const indent = mode === "layer" ? "\t\t" : "\t";
  const body = lines.map((val) => `${indent}${val}`).join("\n");
  let output = "";

  if (banner) {
    output += `/* SLASHED override tokens v${frameworkVersion} — generated by the SLASHED configurator.\n   Load this AFTER the SLASHED stylesheet. ${keys.length} token${keys.length === 1 ? "" : "s"} customised. */\n`;
  }

  return mode === "layer"
    ? `${output}@layer slashed.overrides {\n\t:root {\n${body}\n\t}\n}\n`
    : `${output}:root {\n${body}\n}\n`;
}

export function parseCSS(css: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!css) return result;
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const declarationRe = /(--sf-[\w-]+)\s*:/g;
  let match;

  while ((match = declarationRe.exec(stripped)) !== null) {
    const key = match[1];
    let index = match.index + match[0].length;
    let parenCount = 0;
    let quoteChar = "";
    let accumulatedValue = "";

    for (; index < stripped.length; index++) {
      const char = stripped[index];
      if (quoteChar) {
        if (char === quoteChar && stripped[index - 1] !== "\\") {
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
      result[key] = trimmedVal;
    }
    declarationRe.lastIndex = index;
  }

  return result;
}

export function encodeOverrides(overrides: Record<string, string>): string {
  return encode(overrides, tokensData);
}

const SHARE_PARAM_RE = new RegExp(`[#&]?${SHARE_PARAM}=([^&]+)`);

export function readShareFromHash(hashOrParam: string, options: ShareOptions = {}): Record<string, string> {
  const knownTokensSet = new Set(tokensData.tokens.map((tok) => tok.name));
  const isKnown = options.isKnown ?? ((name: string) => knownTokensSet.has(name));
  let trimmed = String(hashOrParam ?? "").trim();
  const match = trimmed.match(SHARE_PARAM_RE);
  if (match) {
    trimmed = match[1];
  }
  return decode(trimmed, tokensData, { sanitize: sanitizeValue, isKnown });
}

export function buildShareUrl(overrides: Record<string, string>, baseUrlOverride?: string): string {
  const fallbackUrl = typeof window !== "undefined" ? window.location.href : "https://example.com/";
  const baseUrl = baseUrlOverride ?? fallbackUrl;
  const url = new URL(baseUrl);
  const code = encodeOverrides(overrides);
  url.hash = code ? `${SHARE_PARAM}=${code}` : "";
  return url.toString();
}

export function readShareFromHashIfPresent(hash: string, options: ShareOptions = {}): Record<string, string> {
  const value = String(hash ?? "");
  return value.includes(`${SHARE_PARAM}=`) ? readShareFromHash(value, options) : {};
}
