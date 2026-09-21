/**
 * reader.js - High-level EPUB rendering and navigation engine using epub.js
 */
import ePub from 'epubjs';

export class ReaderEngine {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.book = null;
    this.rendition = null;
    this.currentLocation = null;
    this.toc = [];
    this.metadata = {};
    this.onRelocate = options.onRelocate || (() => {});
    this.onLoaded = options.onLoaded || (() => {});
    this.onError = options.onError || console.error;
    this.onKey = options.onKey || (() => {});

    // Reading settings
    this.settings = {
      theme: options.theme || 'sepia',
      fontSize: options.fontSize || 18,
      fontFamily: options.fontFamily || 'serif',
      lineHeight: options.lineHeight || 1.75,
      flow: options.flow || 'paginated', // 'paginated' or 'scrolled'
      spread: options.spread || 'auto'   // 'auto', 'none', 'always'
    };
  }

  async load(bookSource, initialCfi = null) {
    this.destroy();

    try {
      // 1. Initialize book
      this.book = ePub(bookSource);

      // 2. Setup rendition
      this.rendition = this.book.renderTo(this.container, {
        width: '100%',
        height: '100%',
        spread: this.settings.spread,
        flow: this.settings.flow,
        minSpreadWidth: 800
      });

      // 3. Register themes
      this.registerThemes();
      this.applyCurrentStyles();

      // 4. Listen for relocation (page turns)
      this.rendition.on('relocated', (location) => {
        this.currentLocation = location;
        const cfi = location.start.cfi;
        let percentage = 0;

        if (this.book.locations && this.book.locations.total > 0) {
          percentage = this.book.locations.percentageFromCfi(cfi) || 0;
        }

        const chapter = this.getChapterFromCfi(cfi, location.start.href);

        this.onRelocate({
          cfi,
          percentage: Math.round(percentage * 100),
          chapterTitle: chapter ? chapter.label.trim() : '',
          location
        });
      });

      // 5. Handle keyboard inside iframe
      this.rendition.on('keyup', (e) => {
        this.onKey(e);
      });

      // 6. Handle clicks inside iframe (e.g. forward margins)
      this.rendition.on('click', (e) => {
        const width = this.container.clientWidth;
        const x = e.clientX;
        if (x < width * 0.18) {
          this.prev();
        } else if (x > width * 0.82) {
          this.next();
        }
      });

      // 7. Touch Swipe Gestures for Mobile (Kindle-like feel)
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;

      const onTouchStart = (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
        touchStartTime = Date.now();
      };

      const onTouchEnd = (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const duration = Date.now() - touchStartTime;

        // Detect clean horizontal swipe
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && duration < 700) {
          if (deltaX < 0) {
            this.next(); // Swiped left -> Next page
          } else {
            this.prev(); // Swiped right -> Previous page
          }
        }
      };

      this.rendition.on('touchstart', onTouchStart);
      this.rendition.on('touchend', onTouchEnd);
      this.container.addEventListener('touchstart', onTouchStart, { passive: true });
      this.container.addEventListener('touchend', onTouchEnd, { passive: true });

      // 7. Wait for book ready and display
      await this.book.ready;

      // Extract metadata
      this.metadata = await this.book.loaded.metadata;

      // Extract TOC
      const navigation = await this.book.loaded.navigation;
      this.toc = navigation ? navigation.toc : [];

      // Display initial page or resume from CFI
      if (initialCfi) {
        await this.rendition.display(initialCfi);
      } else {
        await this.rendition.display();
      }

      // 8. Generate locations asynchronously in the background for accurate % and slider
      this.book.locations.generate(1200).then(() => {
        if (this.currentLocation) {
          const pct = this.book.locations.percentageFromCfi(this.currentLocation.start.cfi);
          this.onRelocate({
            cfi: this.currentLocation.start.cfi,
            percentage: Math.round((pct || 0) * 100),
            chapterTitle: this.currentLocation.chapterTitle || ''
          });
        }
      }).catch((e) => {
        console.warn('Locations generation note:', e);
      });

      this.onLoaded({
        metadata: this.metadata,
        toc: this.toc
      });

      return true;
    } catch (err) {
      console.error('Failed to load EPUB:', err);
      this.onError(err);
      throw err;
    }
  }

  registerThemes() {
    if (!this.rendition) return;

    this.rendition.themes.register('light', {
      body: {
        'background-color': '#fbfbfa !important',
        color: '#1a1a1e !important'
      },
      a: { color: '#4f46e5 !important' },
      blockquote: { 'border-color': '#4f46e5 !important' }
    });

    this.rendition.themes.register('sepia', {
      body: {
        'background-color': '#fbf0d9 !important',
        color: '#3d2e1e !important'
      },
      a: { color: '#92400e !important' },
      blockquote: { 'border-color': '#b45309 !important' }
    });

    this.rendition.themes.register('dark', {
      body: {
        'background-color': '#18181b !important',
        color: '#e4e4e7 !important'
      },
      a: { color: '#818cf8 !important' },
      blockquote: { 'border-color': '#6366f1 !important' }
    });

    this.rendition.themes.register('amoled', {
      body: {
        'background-color': '#000000 !important',
        color: '#d4d4d8 !important'
      },
      a: { color: '#a5b4fc !important' },
      blockquote: { 'border-color': '#4f46e5 !important' }
    });
  }

  applyCurrentStyles() {
    if (!this.rendition) return;

    // Apply theme
    this.rendition.themes.select(this.settings.theme);

    // Font families
    let fontFamilyVal = "'Lora', Georgia, 'Times New Roman', serif";
    if (this.settings.fontFamily === 'sans') {
      fontFamilyVal = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    } else if (this.settings.fontFamily === 'mono') {
      fontFamilyVal = "'JetBrains Mono', 'Fira Code', monospace";
    } else if (this.settings.fontFamily === 'dyslexic') {
      fontFamilyVal = "'OpenDyslexic', 'Comic Sans MS', sans-serif";
    }

    // Apply font size and typography via themes.fontSize and default rules
    this.rendition.themes.fontSize(`${this.settings.fontSize}px`);
    this.rendition.themes.default({
      body: {
        'font-family': `${fontFamilyVal} !important`,
        'line-height': `${this.settings.lineHeight} !important`,
        'letter-spacing': '0.01em !important',
        padding: '0 2% !important'
      },
      'p, li, div': {
        'font-family': `${fontFamilyVal} !important`,
        'line-height': `${this.settings.lineHeight} !important`
      }
    });
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.applyCurrentStyles();
  }

  next() {
    if (this.rendition) {
      return this.rendition.next();
    }
  }

  prev() {
    if (this.rendition) {
      return this.rendition.prev();
    }
  }

  goToCfi(cfi) {
    if (this.rendition && cfi) {
      return this.rendition.display(cfi);
    }
  }

  goToHref(href) {
    if (this.rendition && href) {
      return this.rendition.display(href);
    }
  }

  goToPercentage(percentageDecimal) {
    if (!this.book || !this.book.locations || !this.rendition) return;
    const clamped = Math.max(0, Math.min(1, percentageDecimal));
    const cfi = this.book.locations.cfiFromPercentage(clamped);
    if (cfi) {
      return this.rendition.display(cfi);
    }
  }

  getChapterFromCfi(cfi, href) {
    if (!this.toc || this.toc.length === 0) return null;

    // Flatten TOC for search
    const flattenToc = (items) => {
      let flat = [];
      for (const item of items) {
        flat.push(item);
        if (item.subitems && item.subitems.length) {
          flat = flat.concat(flattenToc(item.subitems));
        }
      }
      return flat;
    };

    const flat = flattenToc(this.toc);

    if (href) {
      // Find matching href
      const found = flat.find(item => {
        const itemHref = item.href.split('#')[0];
        const currentHref = href.split('#')[0];
        return currentHref.endsWith(itemHref) || itemHref.endsWith(currentHref);
      });
      if (found) return found;
    }

    return null;
  }

  getCurrentText() {
    try {
      if (!this.rendition) return '';
      const contents = this.rendition.getContents();
      if (!contents || contents.length === 0) return '';

      let fullText = '';
      for (const c of contents) {
        if (c.document && c.document.body) {
          fullText += ' ' + c.document.body.innerText;
        }
      }
      return fullText.trim();
    } catch (e) {
      console.warn('Could not extract text:', e);
      return '';
    }
  }

  destroy() {
    if (this.rendition) {
      try {
        this.rendition.destroy();
      } catch (e) {
        // ignore
      }
      this.rendition = null;
    }
    if (this.book) {
      try {
        this.book.destroy();
      } catch (e) {
        // ignore
      }
      this.book = null;
    }
    this.currentLocation = null;
    this.container.innerHTML = '';
  }
}
