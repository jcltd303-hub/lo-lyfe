export type ProfileAnswers = Record<string, string | number | boolean | null>;

type VaultRecord = {
  version: 1;
  key: CryptoKey;
  iv: Uint8Array;
  ciphertext: Uint8Array;
};

export interface VaultStore {
  get(key: string): Promise<VaultRecord | undefined>;
  set(key: string, value: VaultRecord): Promise<void>;
  delete(key: string): Promise<void>;
}

export class VaultCorruptError extends Error {
  constructor() { super('Local profile cannot be decrypted. It has not been replaced.'); }
}

const prohibited = /(ssn|social_security|bank|routing|account_number|credit_card)/i;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const storageKey = (userId: string) => {
  if (!userId) throw new Error('Sign in before accessing a local profile');
  return `profile:${userId}`;
};

export function createDeviceVault(store: VaultStore) {
  return {
    async readProfile(userId: string): Promise<ProfileAnswers | null> {
      const record = await store.get(storageKey(userId));
      if (!record) return null;
      if (record.version !== 1 || !(record.key instanceof CryptoKey)) throw new VaultCorruptError();
      try {
        const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv as BufferSource }, record.key, record.ciphertext as BufferSource);
        const answers = JSON.parse(decoder.decode(bytes));
        if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('Invalid profile');
        return answers as ProfileAnswers;
      } catch {
        throw new VaultCorruptError();
      }
    },
    async writeProfile(userId: string, answers: ProfileAnswers, askEachTime: string[] = []): Promise<void> {
      const id = storageKey(userId);
      const filtered: ProfileAnswers = {};
      for (const [field, value] of Object.entries(answers)) {
        if (prohibited.test(field)) throw new Error('Prohibited profile field');
        if (!askEachTime.includes(field)) filtered[field] = value;
      }
      const current = await store.get(id);
      if (current) await this.readProfile(userId);
      const key = current?.key ?? await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(filtered))));
      await store.set(id, { version: 1, key, iv, ciphertext });
    },
    async deleteProfile(userId: string): Promise<void> {
      await store.delete(storageKey(userId));
    },
  };
}

function request<T>(operation: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error);
  });
}

async function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') throw new Error('Local profile storage is unavailable');
  const opening = indexedDB.open('lo-lyfe-device-profile', 1);
  opening.onupgradeneeded = () => opening.result.createObjectStore('vaults');
  return request(opening);
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('vaults', mode);
      const operation = action(tx.objectStore('vaults'));
      let result: T;
      operation.onsuccess = () => { result = operation.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Local profile write aborted'));
    });
  } finally {
    db.close();
  }
}

export const indexedDbVaultStore: VaultStore = {
  get: key => transaction('readonly', store => store.get(key)),
  set: (key, value) => transaction('readwrite', store => store.put(value, key)).then(() => undefined),
  delete: key => transaction('readwrite', store => store.delete(key)).then(() => undefined),
};
