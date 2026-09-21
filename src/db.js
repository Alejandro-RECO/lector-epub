/**
 * db.js - IndexedDB storage layer for Lumina EPUB Reader
 * Handles storing books (arrayBuffer / blob), metadata, covers, bookmarks, annotations, and settings.
 */

const DB_NAME = 'LuminaEpubDB';
const DB_VERSION = 2;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Books store
      if (!db.objectStoreNames.contains('books')) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id' });
        bookStore.createIndex('title', 'title', { unique: false });
        bookStore.createIndex('lastRead', 'lastRead', { unique: false });
      }

      // Bookmarks store
      if (!db.objectStoreNames.contains('bookmarks')) {
        const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
        bookmarkStore.createIndex('bookId', 'bookId', { unique: false });
      }

      // Annotations & Highlights store
      if (!db.objectStoreNames.contains('annotations')) {
        const annotationStore = db.createObjectStore('annotations', { keyPath: 'id' });
        annotationStore.createIndex('bookId', 'bookId', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export const db = {
  // Books API
  async getAllBooks() {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const request = store.getAll();
      request.onsuccess = () => {
        // Sort by lastRead descending
        const books = request.result || [];
        books.sort((a, b) => (b.lastRead || 0) - (a.lastRead || 0));
        resolve(books);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getBook(id) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveBook(bookData) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      const request = store.put(bookData);
      request.onsuccess = () => resolve(bookData.id);
      request.onerror = () => reject(request.error);
    });
  },

  async updateBookProgress(id, { currentCfi, progressPercent, lastChapter }) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const book = getReq.result;
        if (!book) return resolve(null);

        book.currentCfi = currentCfi || book.currentCfi;
        book.progress = typeof progressPercent === 'number' ? progressPercent : book.progress;
        if (lastChapter) book.lastChapter = lastChapter;
        book.lastRead = Date.now();

        const updateReq = store.put(book);
        updateReq.onsuccess = () => resolve(book);
        updateReq.onerror = () => reject(updateReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  },

  async deleteBook(id) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(['books', 'bookmarks', 'annotations'], 'readwrite');
      const bookStore = tx.objectStore('books');
      const bookmarkStore = tx.objectStore('bookmarks');
      const annotationStore = tx.objectStore('annotations');

      bookStore.delete(id);

      // Clean up bookmarks for this book
      const bmIndex = bookmarkStore.index('bookId');
      const bmReq = bmIndex.openKeyCursor(IDBKeyRange.only(id));
      bmReq.onsuccess = () => {
        const cursor = bmReq.result;
        if (cursor) {
          bookmarkStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      // Clean up annotations for this book
      const annIndex = annotationStore.index('bookId');
      const annReq = annIndex.openKeyCursor(IDBKeyRange.only(id));
      annReq.onsuccess = () => {
        const cursor = annReq.result;
        if (cursor) {
          annotationStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },

  // Bookmarks API
  async getBookmarks(bookId) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('bookmarks', 'readonly');
      const store = tx.objectStore('bookmarks');
      const index = store.index('bookId');
      const request = index.getAll(IDBKeyRange.only(bookId));
      request.onsuccess = () => {
        const list = request.result || [];
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async addBookmark(bookmark) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('bookmarks', 'readwrite');
      const store = tx.objectStore('bookmarks');
      const item = {
        id: 'bm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        createdAt: Date.now(),
        ...bookmark
      };
      const request = store.add(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteBookmark(bookmarkId) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('bookmarks', 'readwrite');
      const store = tx.objectStore('bookmarks');
      const request = store.delete(bookmarkId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  // Annotations & Highlights API
  async getAnnotations(bookId) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('annotations', 'readonly');
      const store = tx.objectStore('annotations');
      const index = store.index('bookId');
      const request = index.getAll(IDBKeyRange.only(bookId));
      request.onsuccess = () => {
        const list = request.result || [];
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async addAnnotation(annotation) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('annotations', 'readwrite');
      const store = tx.objectStore('annotations');
      const item = {
        id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        createdAt: Date.now(),
        ...annotation
      };
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteAnnotation(id) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('annotations', 'readwrite');
      const store = tx.objectStore('annotations');
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  // Settings API
  async getSetting(key, defaultValue = null) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value);
        } else {
          resolve(defaultValue);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async setSetting(key, value) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put({ key, value });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
};
