/**
 * main.js - Application Controller for Lumina EPUB Reader
 */
import ePub from 'epubjs';
import { db } from './db.js';
import { ReaderEngine } from './reader.js';
import { speechManager } from './speech.js';
import { createSampleEpubBlob } from './sample-book.js';

// Application State
const state = {
  books: [],
  currentBook: null,
  reader: null,
  currentView: 'library',
  searchQuery: '',
  settings: {
    theme: 'sepia',
    fontSize: 18,
    fontFamily: 'serif',
    lineHeight: 1.75,
    pageWidth: 900
  },
  tocItems: [],
  currentCfi: null,
  saveDebounceTimer: null
};

// DOM Elements
const elements = {
  libraryView: document.getElementById('library-view'),
  readerView: document.getElementById('reader-view'),
  booksGrid: document.getElementById('books-grid'),
  searchInput: document.getElementById('search-input'),
  btnSample: document.getElementById('btn-sample'),
  btnInstall: document.getElementById('btn-install'),
  btnUpload: document.getElementById('btn-upload'),
  fileInput: document.getElementById('file-input'),
  statTotal: document.getElementById('stat-total'),
  statReading: document.getElementById('stat-reading'),
  dropOverlay: document.getElementById('drop-overlay'),
  toastContainer: document.getElementById('toast-container'),

  // Reader Elements
  btnBack: document.getElementById('btn-back'),
  btnToggleToc: document.getElementById('btn-toggle-toc'),
  readerBookTitle: document.getElementById('reader-book-title'),
  readerChapterTitle: document.getElementById('reader-chapter-title'),
  btnBookmark: document.getElementById('btn-bookmark'),
  btnTts: document.getElementById('btn-tts'),
  btnSettings: document.getElementById('btn-settings'),
  btnFullscreen: document.getElementById('btn-fullscreen'),
  readerContainer: document.getElementById('reader-container'),
  btnPrevPage: document.getElementById('btn-prev-page'),
  btnNextPage: document.getElementById('btn-next-page'),
  btnPrevChapter: document.getElementById('btn-prev-chapter'),
  btnNextChapter: document.getElementById('btn-next-chapter'),
  progressSlider: document.getElementById('progress-slider'),
  progressText: document.getElementById('progress-text'),

  // Settings Flyout
  settingsModal: document.getElementById('settings-modal'),
  themeChips: document.querySelectorAll('.theme-chip'),
  fontButtons: document.querySelectorAll('.font-btn'),
  fontSizeSlider: document.getElementById('font-size-slider'),
  fontSizeVal: document.getElementById('font-size-val'),
  lineHeightSlider: document.getElementById('line-height-slider'),
  lineHeightVal: document.getElementById('line-height-val'),
  pageWidthSlider: document.getElementById('page-width-slider'),
  pageWidthVal: document.getElementById('page-width-val'),

  // Drawer
  readerDrawer: document.getElementById('reader-drawer'),
  drawerOverlay: document.getElementById('drawer-overlay'),
  btnCloseDrawer: document.getElementById('btn-close-drawer'),
  tabToc: document.getElementById('tab-toc'),
  tabBookmarks: document.getElementById('tab-bookmarks'),
  tocList: document.getElementById('toc-list'),
  bookmarksList: document.getElementById('bookmarks-list'),

  // Speech TTS Bar
  speechBar: document.getElementById('speech-bar'),
  btnSpeechPause: document.getElementById('btn-speech-pause'),
  btnSpeechRate: document.getElementById('btn-speech-rate'),
  btnSpeechStop: document.getElementById('btn-speech-stop')
};

// ============================================================================
// INITIALIZATION
// ============================================================================
async function init() {
  await loadSettings();
  setupEventListeners();
  await loadLibrary();

  // If library is completely empty on first visit, optionally offer the sample book
  if (state.books.length === 0) {
    console.log('Library is empty. Ready for EPUB files or Demo.');
  }
}

// ============================================================================
// SETTINGS
// ============================================================================
async function loadSettings() {
  const savedSettings = await db.getSetting('readerSettings');
  if (savedSettings) {
    state.settings = { ...state.settings, ...savedSettings };
  }
  applySettingsToUI();
}

function applySettingsToUI() {
  // Theme chip active state
  elements.themeChips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.theme === state.settings.theme);
  });

  // Font button active state
  elements.fontButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.font === state.settings.fontFamily);
  });

  // Sliders
  elements.fontSizeSlider.value = state.settings.fontSize;
  elements.fontSizeVal.textContent = `${state.settings.fontSize}px`;

  elements.lineHeightSlider.value = state.settings.lineHeight;
  elements.lineHeightVal.textContent = `${state.settings.lineHeight}`;

  elements.pageWidthSlider.value = state.settings.pageWidth;
  elements.pageWidthVal.textContent = `${state.settings.pageWidth}px`;
  elements.readerContainer.style.maxWidth = `${state.settings.pageWidth}px`;

  // Reader view theme class
  elements.readerView.className = `reader-view theme-${state.settings.theme}`;
}

async function updateSetting(key, val) {
  state.settings[key] = val;
  applySettingsToUI();
  if (state.reader) {
    state.reader.updateSettings(state.settings);
  }
  await db.setSetting('readerSettings', state.settings);
}

// ============================================================================
// LIBRARY MANAGEMENT
// ============================================================================
async function loadLibrary() {
  state.books = await db.getAllBooks();
  renderLibrary();
}

function renderLibrary() {
  const filtered = state.books.filter(b => {
    if (!state.searchQuery) return true;
    const q = state.searchQuery.toLowerCase();
    return (
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.author && b.author.toLowerCase().includes(q))
    );
  });

  // Update stats
  elements.statTotal.textContent = state.books.length;
  const inProgress = state.books.filter(b => (b.progress || 0) > 0 && (b.progress || 0) < 100).length;
  elements.statReading.textContent = inProgress;

  elements.booksGrid.innerHTML = '';

  if (filtered.length === 0) {
    elements.booksGrid.innerHTML = `
      <div class="empty-shelf">
        <div class="empty-icon-wrap">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
            <path d="M6 6h10"></path>
            <path d="M6 10h10"></path>
          </svg>
        </div>
        <h2>${state.searchQuery ? 'No se encontraron libros' : 'Tu estantería está vacía'}</h2>
        <p>${
          state.searchQuery
            ? 'Prueba con otro término de búsqueda.'
            : 'Sube tus libros en formato .epub o prueba el libro de demostración con un clic.'
        }</p>
        <div class="empty-buttons">
          <button id="btn-empty-sample" class="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Cargar "El Principito"
          </button>
          <button id="btn-empty-upload" class="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Seleccionar archivo EPUB
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-empty-sample')?.addEventListener('click', loadSampleBook);
    document.getElementById('btn-empty-upload')?.addEventListener('click', () => elements.fileInput.click());
    return;
  }

  filtered.forEach(book => {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.dataset.id = book.id;

    const progress = Math.min(100, Math.max(0, book.progress || 0));

    // Cover image or fallback
    let coverHtml = '';
    if (book.coverUrl) {
      coverHtml = `<img class="book-cover-img" src="${book.coverUrl}" alt="Portada de ${escapeHtml(book.title)}" loading="lazy" />`;
    } else {
      coverHtml = `
        <div class="book-cover-fallback">
          <div class="fallback-title">${escapeHtml(book.title || 'Sin título')}</div>
          <div class="fallback-author">${escapeHtml(book.author || 'Autor desconocido')}</div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="book-cover-wrap">
        ${coverHtml}
        <span class="book-badge">${progress}%</span>
      </div>
      <div class="book-info">
        <h3 class="book-title" title="${escapeHtml(book.title || '')}">${escapeHtml(book.title || 'Sin título')}</h3>
        <span class="book-author">${escapeHtml(book.author || 'Desconocido')}</span>
        <div class="book-progress-wrap">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${progress}%;"></div>
          </div>
          <div class="progress-label-row">
            <span>${progress > 0 ? (progress === 100 ? 'Completado' : 'Continuar') : 'Nuevo'}</span>
            <span>${book.lastChapter ? escapeHtml(book.lastChapter) : ''}</span>
          </div>
        </div>
      </div>
      <div class="book-card-actions">
        <button class="btn-card-del" title="Eliminar de la biblioteca" data-action="delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // Click on card opens reader
    card.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-action="delete"]');
      if (delBtn) {
        e.stopPropagation();
        confirmDeleteBook(book);
        return;
      }
      openReader(book.id);
    });

    elements.booksGrid.appendChild(card);
  });
}

// ============================================================================
// IMPORT & FILE HANDLING
// ============================================================================
async function handleFiles(files) {
  if (!files || files.length === 0) return;

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.epub') && file.type !== 'application/epub+zip') {
      showToast('Por favor, selecciona un archivo en formato .epub válido.', 'error');
      continue;
    }

    try {
      showToast(`Importando "${file.name}"...`, 'info');
      const arrayBuffer = await file.arrayBuffer();
      await importEpubBuffer(arrayBuffer, file.name);
    } catch (err) {
      console.error('Error procesando el EPUB:', err);
      showToast(`Error al procesar "${file.name}": Archivo dañado o formato no soportado.`, 'error');
    }
  }
}

async function importEpubBuffer(arrayBuffer, filename = 'Libro') {
  // Parse with epub.js to extract metadata and cover
  const book = ePub(arrayBuffer);
  await book.ready;

  const metadata = await book.loaded.metadata;
  let coverUrl = null;

  try {
    const rawCoverUrl = await book.coverUrl();
    if (rawCoverUrl) {
      // Convert object URL or internal URL to Blob URL / DataURL
      const resp = await fetch(rawCoverUrl);
      const blob = await resp.blob();
      coverUrl = await blobToDataURL(blob);
    }
  } catch (e) {
    console.warn('Cover extraction note:', e);
  }

  const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const newBook = {
    id: bookId,
    title: metadata.title ? metadata.title.trim() : filename.replace(/\.epub$/i, ''),
    author: metadata.creator ? metadata.creator.trim() : 'Autor desconocido',
    description: metadata.description || '',
    coverUrl: coverUrl,
    blob: new Blob([arrayBuffer], { type: 'application/epub+zip' }),
    addedDate: Date.now(),
    lastRead: Date.now(),
    progress: 0,
    currentCfi: null
  };

  await db.saveBook(newBook);
  book.destroy();

  await loadLibrary();
  showToast(`¡"${newBook.title}" añadido con éxito!`);
  openReader(newBook.id);
}

async function loadSampleBook() {
  try {
    showToast('Generando libro clásico de prueba ("El Principito")...');
    const sampleData = await createSampleEpubBlob();
    await db.saveBook(sampleData);
    await loadLibrary();
    showToast('¡"El Principito" cargado correctamente!');
    openReader(sampleData.id);
  } catch (err) {
    console.error('Error generating sample book:', err);
    showToast('No se pudo cargar el libro de muestra.', 'error');
  }
}

async function confirmDeleteBook(book) {
  if (confirm(`¿Estás seguro de que deseas eliminar "${book.title}" de tu estantería?`)) {
    await db.deleteBook(book.id);
    await loadLibrary();
    showToast(`"${book.title}" ha sido eliminado.`);
  }
}

// ============================================================================
// READER VIEW
// ============================================================================
async function openReader(bookId) {
  const book = await db.getBook(bookId);
  if (!book) {
    showToast('No se pudo abrir el libro.', 'error');
    return;
  }

  state.currentBook = book;
  state.currentView = 'reader';

  // Switch views
  elements.libraryView.style.display = 'none';
  elements.readerView.style.display = 'flex';

  // Set titles
  elements.readerBookTitle.textContent = book.title;
  elements.readerChapterTitle.textContent = book.lastChapter || 'Iniciando lectura...';

  // Initialize reader engine
  if (state.reader) {
    state.reader.destroy();
  }

  state.reader = new ReaderEngine(elements.readerContainer, {
    theme: state.settings.theme,
    fontSize: state.settings.fontSize,
    fontFamily: state.settings.fontFamily,
    lineHeight: state.settings.lineHeight,
    onRelocate: handleReaderRelocate,
    onLoaded: handleReaderLoaded,
    onError: (err) => {
      showToast('Error cargando el contenido del libro.', 'error');
    },
    onKey: handleKeyboardShortcut
  });

  try {
    await state.reader.load(book.blob, book.currentCfi);
  } catch (e) {
    console.error('Failed to open book:', e);
  }
}

function closeReader() {
  if (state.reader) {
    state.reader.destroy();
    state.reader = null;
  }

  speechManager.stop();
  elements.speechBar.classList.remove('open', 'playing');
  closeDrawer();
  closeSettingsModal();

  state.currentBook = null;
  state.currentView = 'library';

  elements.readerView.style.display = 'none';
  elements.libraryView.style.display = 'flex';

  loadLibrary();
}

function handleReaderLoaded({ metadata, toc }) {
  state.tocItems = toc;
  renderToc(toc);
  loadBookmarksForCurrentBook();
}

function handleReaderRelocate({ cfi, percentage, chapterTitle }) {
  state.currentCfi = cfi;

  // Update slider & percentage
  elements.progressSlider.value = percentage;
  elements.progressText.textContent = `${percentage}%`;

  // Update chapter title if detected
  if (chapterTitle) {
    elements.readerChapterTitle.textContent = chapterTitle;
  }

  // Highlight active TOC item
  highlightActiveTocItem();

  // Debounced save to IndexedDB
  clearTimeout(state.saveDebounceTimer);
  state.saveDebounceTimer = setTimeout(async () => {
    if (state.currentBook) {
      await db.updateBookProgress(state.currentBook.id, {
        currentCfi: cfi,
        progressPercent: percentage,
        lastChapter: chapterTitle || state.currentBook.lastChapter
      });
      state.currentBook.progress = percentage;
    }
  }, 500);
}

// ============================================================================
// TABLE OF CONTENTS & BOOKMARKS DRAWER
// ============================================================================
function renderToc(tocList, container = elements.tocList, depth = 0) {
  container.innerHTML = '';

  if (!tocList || tocList.length === 0) {
    container.innerHTML = '<li style="padding: 1rem; color: var(--text-muted); font-size: 0.85rem;">No hay tabla de contenidos disponible para este libro.</li>';
    return;
  }

  tocList.forEach(item => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'btn toc-item-btn';
    btn.style.paddingLeft = `${0.85 + depth * 1}rem`;
    btn.textContent = item.label ? item.label.trim() : 'Capítulo';
    btn.dataset.href = item.href;

    btn.addEventListener('click', () => {
      if (state.reader) {
        state.reader.goToHref(item.href);
      }
      closeDrawer();
    });

    li.appendChild(btn);

    if (item.subitems && item.subitems.length > 0) {
      const subUl = document.createElement('ul');
      subUl.className = 'toc-list';
      renderToc(item.subitems, subUl, depth + 1);
      li.appendChild(subUl);
    }

    container.appendChild(li);
  });
}

function highlightActiveTocItem() {
  if (!state.reader || !state.reader.currentLocation) return;
  const href = state.reader.currentLocation.start.href;
  const buttons = elements.tocList.querySelectorAll('.toc-item-btn');
  buttons.forEach(btn => {
    const btnHref = (btn.dataset.href || '').split('#')[0];
    const currentHref = (href || '').split('#')[0];
    const isActive = btnHref && currentHref && (currentHref.endsWith(btnHref) || btnHref.endsWith(currentHref));
    btn.classList.toggle('active', isActive);
  });
}

async function loadBookmarksForCurrentBook() {
  if (!state.currentBook) return;
  const bookmarks = await db.getBookmarks(state.currentBook.id);
  elements.bookmarksList.innerHTML = '';

  if (bookmarks.length === 0) {
    elements.bookmarksList.innerHTML = `
      <div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        No tienes marcadores guardados todavía.<br/>Pulsa el botón de marcador o la tecla <strong>B</strong> para guardar una página.
      </div>
    `;
    return;
  }

  bookmarks.forEach(bm => {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    const dateStr = new Date(bm.createdAt).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    card.innerHTML = `
      <div class="bookmark-info">
        <span class="bookmark-chapter">${escapeHtml(bm.chapterTitle || 'Marcador')}</span>
        <span class="bookmark-date">${dateStr}</span>
      </div>
      <button class="btn-icon" style="width: 28px; height: 28px;" title="Eliminar marcador" data-bm-del="${bm.id}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    card.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-bm-del]');
      if (delBtn) {
        e.stopPropagation();
        deleteBookmark(bm.id);
        return;
      }
      if (state.reader) {
        state.reader.goToCfi(bm.cfi);
      }
      closeDrawer();
    });

    elements.bookmarksList.appendChild(card);
  });
}

async function addBookmarkCurrentPage() {
  if (!state.currentBook || !state.currentCfi) return;

  const currentChapter = elements.readerChapterTitle.textContent || 'Página marcada';
  await db.addBookmark({
    bookId: state.currentBook.id,
    cfi: state.currentCfi,
    chapterTitle: currentChapter
  });

  showToast('Marcador guardado');
  await loadBookmarksForCurrentBook();
}

async function deleteBookmark(id) {
  await db.deleteBookmark(id);
  await loadBookmarksForCurrentBook();
  showToast('Marcador eliminado');
}

function openDrawer() {
  elements.readerDrawer.classList.add('open');
  elements.drawerOverlay.classList.add('open');
}

function closeDrawer() {
  elements.readerDrawer.classList.remove('open');
  elements.drawerOverlay.classList.remove('open');
}

function closeSettingsModal() {
  elements.settingsModal.classList.remove('open');
}

// ============================================================================
// TEXT-TO-SPEECH (TTS)
// ============================================================================
function toggleTts() {
  if (!speechManager.isSupported()) {
    showToast('Tu navegador no soporta síntesis de voz.', 'error');
    return;
  }

  if (speechManager.isPlaying) {
    speechManager.stop();
    elements.speechBar.classList.remove('open', 'playing');
  } else {
    const text = state.reader ? state.reader.getCurrentText() : '';
    if (!text) {
      showToast('No se encontró texto en esta sección para leer.', 'error');
      return;
    }

    elements.speechBar.classList.add('open', 'playing');
    speechManager.speak(text);
  }
}

// Speech state observer
speechManager.subscribe(({ state: speechState }) => {
  if (speechState === 'playing') {
    elements.speechBar.classList.add('open', 'playing');
    elements.btnSpeechPause.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>
    `;
  } else if (speechState === 'paused') {
    elements.speechBar.classList.remove('playing');
    elements.btnSpeechPause.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
    `;
  } else {
    // stopped
    elements.speechBar.classList.remove('playing');
  }
});

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================
function handleKeyboardShortcut(e) {
  // If typing in input, ignore
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (state.currentView !== 'reader') return;

  switch (e.key) {
    case 'ArrowRight':
    case 'PageDown':
    case ' ':
      e.preventDefault();
      state.reader?.next();
      break;
    case 'ArrowLeft':
    case 'PageUp':
      e.preventDefault();
      state.reader?.prev();
      break;
    case 'b':
    case 'B':
      addBookmarkCurrentPage();
      break;
    case 't':
    case 'T':
      if (elements.readerDrawer.classList.contains('open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
    case 'Escape':
      if (elements.readerDrawer.classList.contains('open')) {
        closeDrawer();
      } else if (elements.settingsModal.classList.contains('open')) {
        closeSettingsModal();
      } else {
        closeReader();
      }
      break;
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================
function setupEventListeners() {
  // File input & Upload
  elements.btnUpload.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  });

  // Sample book button
  elements.btnSample.addEventListener('click', loadSampleBook);

  // Search input
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    renderLibrary();
  });

  // Window drag & drop
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    elements.dropOverlay.classList.add('active');
  });

  elements.dropOverlay.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  elements.dropOverlay.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) {
      elements.dropOverlay.classList.remove('active');
    }
  });

  elements.dropOverlay.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropOverlay.classList.remove('active');
    handleFiles(e.dataTransfer.files);
  });

  // Reader Top Bar
  elements.btnBack.addEventListener('click', closeReader);
  elements.btnBookmark.addEventListener('click', addBookmarkCurrentPage);
  elements.btnTts.addEventListener('click', toggleTts);
  elements.btnFullscreen.addEventListener('click', toggleFullscreen);

  // Reader navigation
  elements.btnPrevPage.addEventListener('click', () => state.reader?.prev());
  elements.btnNextPage.addEventListener('click', () => state.reader?.next());

  // Slider scrubber
  elements.progressSlider.addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    if (state.reader) {
      state.reader.goToPercentage(val / 100);
    }
  });

  // Prev / Next Chapter
  elements.btnPrevChapter.addEventListener('click', () => {
    // Jump -10% or previous section
    const currentPct = parseFloat(elements.progressSlider.value) || 0;
    const target = Math.max(0, currentPct - 5);
    state.reader?.goToPercentage(target / 100);
  });

  elements.btnNextChapter.addEventListener('click', () => {
    // Jump +10% or next section
    const currentPct = parseFloat(elements.progressSlider.value) || 0;
    const target = Math.min(100, currentPct + 5);
    state.reader?.goToPercentage(target / 100);
  });

  // Settings Flyout Toggle
  elements.btnSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.settingsModal.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!elements.settingsModal.contains(e.target) && e.target !== elements.btnSettings) {
      closeSettingsModal();
    }
  });

  // Theme chips
  elements.themeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      updateSetting('theme', chip.dataset.theme);
    });
  });

  // Font buttons
  elements.fontButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      updateSetting('fontFamily', btn.dataset.font);
    });
  });

  // Font size slider
  elements.fontSizeSlider.addEventListener('input', (e) => {
    const size = parseInt(e.target.value, 10);
    elements.fontSizeVal.textContent = `${size}px`;
    updateSetting('fontSize', size);
  });

  // Line height slider
  elements.lineHeightSlider.addEventListener('input', (e) => {
    const lh = parseFloat(e.target.value);
    elements.lineHeightVal.textContent = `${lh}`;
    updateSetting('lineHeight', lh);
  });

  // Page width slider
  elements.pageWidthSlider.addEventListener('input', (e) => {
    const width = parseInt(e.target.value, 10);
    elements.pageWidthVal.textContent = `${width}px`;
    elements.readerContainer.style.maxWidth = `${width}px`;
    updateSetting('pageWidth', width);
  });

  // Drawer
  elements.btnToggleToc.addEventListener('click', () => {
    if (elements.readerDrawer.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  elements.btnCloseDrawer.addEventListener('click', closeDrawer);
  elements.drawerOverlay.addEventListener('click', closeDrawer);

  elements.tabToc.addEventListener('click', () => {
    elements.tabToc.classList.add('active');
    elements.tabBookmarks.classList.remove('active');
    elements.tocList.style.display = 'flex';
    elements.bookmarksList.style.display = 'none';
  });

  elements.tabBookmarks.addEventListener('click', () => {
    elements.tabBookmarks.classList.add('active');
    elements.tabToc.classList.remove('active');
    elements.tocList.style.display = 'none';
    elements.bookmarksList.style.display = 'block';
  });

  // Speech Floating Controls
  elements.btnSpeechPause.addEventListener('click', () => {
    if (speechManager.isPaused) {
      speechManager.resume();
    } else {
      speechManager.pause();
    }
  });

  elements.btnSpeechStop.addEventListener('click', () => {
    speechManager.stop();
    elements.speechBar.classList.remove('open', 'playing');
  });

  // Speech Speed Cycle (1.0x -> 1.25x -> 1.5x -> 0.75x -> 1.0x)
  const speeds = [1.0, 1.25, 1.5, 0.75];
  let speedIdx = 0;
  elements.btnSpeechRate.addEventListener('click', () => {
    speedIdx = (speedIdx + 1) % speeds.length;
    const newSpeed = speeds[speedIdx];
    speechManager.setRate(newSpeed);
    elements.btnSpeechRate.textContent = `${newSpeed}x`;
    showToast(`Velocidad de voz: ${newSpeed}x`);
  });

  // Global Keyboard shortcuts
  window.addEventListener('keydown', handleKeyboardShortcut);
}

// ============================================================================
// UTILITIES
// ============================================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') {
    toast.style.borderLeftColor = '#ef4444';
  }

  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============================================================================
// PWA & SERVICE WORKER
// ============================================================================
let deferredInstallPrompt = null;

function initPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = import.meta.env.BASE_URL + 'sw.js';
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => console.log('ServiceWorker registrado con éxito:', reg.scope))
        .catch((err) => console.warn('Error registrando ServiceWorker:', err));
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (elements.btnInstall) {
      elements.btnInstall.style.display = 'inline-flex';
    }
  });

  if (elements.btnInstall) {
    elements.btnInstall.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('¡Instalando Lumina EPUB en tu dispositivo!');
          elements.btnInstall.style.display = 'none';
        }
        deferredInstallPrompt = null;
      }
    });
  }
}

// Start application
init();
initPwa();
