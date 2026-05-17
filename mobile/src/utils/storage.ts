import * as SecureStore from "expo-secure-store";

// ──────────────────────────────────────────
// SecureStore wrapper with try/catch
// Rule: client-localstorage-schema — version & minimize stored data
// ──────────────────────────────────────────

const STORAGE_VERSION = "v1";

function key(name: string): string {
  return `${STORAGE_VERSION}_${name}`;
}

export async function getItem(name: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key(name));
  } catch (e) {
    console.error("[Storage] getItem error:", e);
    return null;
  }
}

export async function setItem(name: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key(name), value);
  } catch (e) {
    console.error("[Storage] setItem error:", e);
  }
}

export async function removeItem(name: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key(name));
  } catch (e) {
    console.error("[Storage] removeItem error:", e);
  }
}

export async function getJSON<T>(name: string): Promise<T | null> {
  const raw = await getItem(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(name: string, value: unknown): Promise<void> {
  await setItem(name, JSON.stringify(value));
}
