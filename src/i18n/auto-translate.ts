"use client";

import type { Language, Messages } from "./translations";

type FlatMap = Record<string, string>;

const messagesCacheInMemory = new Map<Language, FlatMap>();
const stringsCacheInMemory = new Map<Language, Record<string, string>>();
const inFlightTranslations = new Map<string, Promise<string>>();
const inFlightBatchTranslations = new Map<string, Promise<Record<string, string>>>();
const TRANSLATE_BATCH_SIZE = 20;

function flattenMessages(value: unknown, prefix = ""): FlatMap {
  const flat: FlatMap = {};
  const stack: Array<{ node: unknown; path: string }> = [{ node: value, path: prefix }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    if (typeof current.node === "string") {
      flat[current.path] = current.node;
      continue;
    }

    if (!current.node || typeof current.node !== "object") continue;

    const entries = Object.entries(current.node as Record<string, unknown>);
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const [key, nested] = entries[i];
      stack.push({ node: nested, path: current.path ? `${current.path}.${key}` : key });
    }
  }

  return flat;
}

function unflattenMessages(flat: FlatMap): Messages {
  const root: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const keys = path.split(".");
    let current: Record<string, unknown> = root;

    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        current[key] = value;
        return;
      }
      if (!current[key] || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    });
  }
  return root as Messages;
}

async function translateText(text: string, targetLanguage: Language): Promise<string> {
  if (targetLanguage === "en") return text;
  const requestKey = `${targetLanguage}:${text}`;

  const existing = inFlightTranslations.get(requestKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`
      );
      if (!response.ok) return text;

      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload) || !Array.isArray(payload[0])) return text;

      const translated = (payload[0] as unknown[])
        .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
        .join("");

      return translated || text;
    } catch {
      return text;
    } finally {
      inFlightTranslations.delete(requestKey);
    }
  })();

  inFlightTranslations.set(requestKey, promise);
  return promise;
}

function parseBatchTranslationPayload(payload: unknown, sourceValues: string[]): Record<string, string> {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return {};

  const result: Record<string, string> = {};
  sourceValues.forEach((value, index) => {
    const item = payload[0]?.[index] as unknown;
    if (Array.isArray(item) && typeof item[0] === "string" && item[0].length > 0) {
      result[value] = item[0];
    }
  });

  return result;
}

async function translateBatch(values: string[], targetLanguage: Language): Promise<Record<string, string>> {
  if (values.length === 0 || targetLanguage === "en") return {};

  const key = `${targetLanguage}:${values.join("|||")}`;
  const existing = inFlightBatchTranslations.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const query = values.map((value) => `q=${encodeURIComponent(value)}`).join("&");
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLanguage}&dt=t&${query}`
      );
      if (!response.ok) return {};

      const payload = (await response.json()) as unknown;
      const parsed = parseBatchTranslationPayload(payload, values);

      if (Object.keys(parsed).length === values.length) return parsed;

      const fallbackPairs = await Promise.all(values.map(async (value) => [value, await translateText(value, targetLanguage)] as const));
      return fallbackPairs.reduce<Record<string, string>>((acc, [value, translated]) => {
        acc[value] = translated;
        return acc;
      }, parsed);
    } catch {
      const fallbackPairs = await Promise.all(values.map(async (value) => [value, await translateText(value, targetLanguage)] as const));
      return fallbackPairs.reduce<Record<string, string>>((acc, [value, translated]) => {
        acc[value] = translated;
        return acc;
      }, {});
    } finally {
      inFlightBatchTranslations.delete(key);
    }
  })();

  inFlightBatchTranslations.set(key, promise);
  return promise;
}

function getCacheKey(language: Language) {
  return `linkup-auto-i18n-${language}-v1`;
}

function getStringCacheKey(language: Language) {
  return `linkup-auto-i18n-strings-${language}-v1`;
}

function readCachedFlat(language: Language): FlatMap {
  const memory = messagesCacheInMemory.get(language);
  if (memory) return memory;

  const cachedRaw = window.localStorage.getItem(getCacheKey(language));
  if (!cachedRaw) {
    const empty: FlatMap = {};
    messagesCacheInMemory.set(language, empty);
    return empty;
  }

  try {
    const parsed = JSON.parse(cachedRaw) as FlatMap;
    messagesCacheInMemory.set(language, parsed);
    return parsed;
  } catch {
    const empty: FlatMap = {};
    messagesCacheInMemory.set(language, empty);
    return empty;
  }
}

function readStringCache(language: Language): Record<string, string> {
  const memory = stringsCacheInMemory.get(language);
  if (memory) return memory;

  const raw = window.localStorage.getItem(getStringCacheKey(language));
  if (!raw) {
    const empty: Record<string, string> = {};
    stringsCacheInMemory.set(language, empty);
    return empty;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    stringsCacheInMemory.set(language, parsed);
    return parsed;
  } catch {
    const empty: Record<string, string> = {};
    stringsCacheInMemory.set(language, empty);
    return empty;
  }
}

export async function buildTranslatedMessages(language: Language, source: Messages): Promise<Messages> {
  if (language === "en") return source;

  const sourceFlat = flattenMessages(source);
  const cachedFlat = readCachedFlat(language);

  const missingEntries = Object.entries(sourceFlat).filter(([key]) => !cachedFlat[key]);
  if (missingEntries.length > 0) {
    const translatedPairs: Array<readonly [string, string]> = [];
    for (let i = 0; i < missingEntries.length; i += TRANSLATE_BATCH_SIZE) {
      const chunk = missingEntries.slice(i, i + TRANSLATE_BATCH_SIZE);
      const translatedChunk = await translateBatch(
        chunk.map(([, value]) => value),
        language
      );
      chunk.forEach(([key, value]) => {
        translatedPairs.push([key, translatedChunk[value] || value] as const);
      });
    }

    translatedPairs.forEach(([key, value]) => {
      cachedFlat[key] = value;
    });

    messagesCacheInMemory.set(language, cachedFlat);
    window.localStorage.setItem(getCacheKey(language), JSON.stringify(cachedFlat));
  }

  const mergedFlat: FlatMap = {};
  Object.entries(sourceFlat).forEach(([key, value]) => {
    mergedFlat[key] = cachedFlat[key] || value;
  });

  return unflattenMessages(mergedFlat);
}

export async function translateStrings(language: Language, values: string[]): Promise<string[]> {
  if (language === "en") return values;

  const cacheMap = readStringCache(language);
  const uniqueValues = Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
  const missing = uniqueValues.filter((value) => !cacheMap[value]);

  if (missing.length > 0) {
    for (let i = 0; i < missing.length; i += TRANSLATE_BATCH_SIZE) {
      const chunk = missing.slice(i, i + TRANSLATE_BATCH_SIZE);
      const translatedChunk = await translateBatch(chunk, language);
      chunk.forEach((key) => {
        cacheMap[key] = translatedChunk[key] || key;
      });
    }

    stringsCacheInMemory.set(language, cacheMap);
    window.localStorage.setItem(getStringCacheKey(language), JSON.stringify(cacheMap));
  }

  return values.map((value) => {
    const key = value.trim();
    if (key.length === 0) return value;
    return cacheMap[key] || value;
  });
}
