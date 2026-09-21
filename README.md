# Lumina EPUB — Lector Local y Privado de Libros Electrónicos

Lumina EPUB es un lector de libros electrónicos moderno, inmersivo y 100% privado en formato EPUB. Diseñado para ejecutarse tanto en computadoras de escritorio como en teléfonos móviles (Android e iOS) como **Progressive Web App (PWA)** offline.

---

## Características

- 📱 **100% Offline & PWA**: Instálalo en tu teléfono móvil o escritorio. Funciona sin conexión a internet y almacena los libros en la memoria local (`IndexedDB`).
- 👆 **Gestos Táctiles Móviles**: Desliza el dedo hacia la izquierda o derecha (*swipe*) para cambiar de página fluidamente.
- 🎨 **4 Temas de Lectura**: Luz (blanco), Sepia cálido (anti-fatiga visual), Noche (gris carbón) y OLED (negro absoluto).
- 🔤 **Tipografía Personalizable**: Selección de fuentes (*Lora / Serif*, *Inter / Sans*, *Monospace*), ajuste fino del tamaño de letra (13px - 28px), interlineado y ancho de página.
- 📑 **Navegación & Marcadores**: Tabla de contenidos con salto directo de capítulos y gestión de marcadores con fecha.
- 🔊 **Lectura en Voz Alta (Text-to-Speech)**: Escucha tus libros con selector de velocidad y controles flotantes.
- 🔒 **Privacidad Total**: Tus libros nunca se suben a ningún servidor externo. Todo el procesamiento y almacenamiento se realiza en tu navegador.

---

## Tecnologías Utilizadas

- **HTML5 & Vanilla CSS**: Sistema de diseño moderno con Glassmorphism y animaciones fluidas.
- **JavaScript (ES Modules)**: Lógica modular y limpia.
- **[epub.js](https://github.com/futurepress/epub.js) & [JSZip](https://stuk.github.io/jszip/)**: Renderizado y descompresión del formato EPUB en el cliente.
- **IndexedDB**: Almacenamiento local persistente para archivos binarios, portadas y progreso.
- **Vite**: Empaquetado y servidor ultrarrápido.
- **Service Worker & Web App Manifest**: Capacidades PWA para instalación móvil y caché offline.

---

## Ejecución Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```
