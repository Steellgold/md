const DB_NAME = "markdown-app";
const DB_VERSION = 1;
const HANDLE_STORE = "file-handles";

const openDatabase = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(HANDLE_STORE)) {
        database.createObjectStore(HANDLE_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB unavailable"));
  });
};

const withStore = <T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
) => {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(HANDLE_STORE, mode);
        const store = transaction.objectStore(HANDLE_STORE);
        const request = callback(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("IndexedDB request failed"));

        transaction.oncomplete = () => database.close();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error("IndexedDB transaction failed"));
      })
  );
};

export const saveHandle = async (id: string, handle: FileSystemHandle) => {
  await withStore("readwrite", (store) => store.put(handle, id));
};

export const deleteHandle = async (id: string) => {
  await withStore("readwrite", (store) => store.delete(id));
};

export const getHandle = async (id: string) => {
  return withStore<FileSystemHandle | undefined>("readonly", (store) =>
    store.get(id)
  );
};
