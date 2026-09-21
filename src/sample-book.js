/**
 * sample-book.js
 * Generates a high-quality, valid EPUB in memory using JSZip
 * containing iconic chapters of "El Principito" by Antoine de Saint-Exupéry.
 */
import JSZip from 'jszip';

export async function createSampleEpubBlob() {
  const zip = new JSZip();

  // 1. mimetype (must be uncompressed at root)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.folder('META-INF').file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  const oebps = zip.folder('OEBPS');

  // 3. OEBPS/style.css
  oebps.file(
    'style.css',
    `body {
  font-family: serif;
  line-height: 1.75;
  margin: 5% 8%;
  color: inherit;
}
h1, h2, h3 {
  font-family: sans-serif;
  text-align: center;
  margin-bottom: 1.2rem;
  letter-spacing: -0.02em;
}
.subtitle {
  text-align: center;
  font-style: italic;
  opacity: 0.8;
  margin-bottom: 2.5rem;
}
p {
  text-indent: 1.5em;
  margin-top: 0;
  margin-bottom: 0.8em;
  text-align: justify;
}
blockquote {
  border-left: 3px solid #6366f1;
  padding-left: 1.2rem;
  margin: 1.5rem 1rem;
  font-style: italic;
}
.quote-author {
  text-align: right;
  font-size: 0.9em;
  opacity: 0.85;
}
.center-box {
  text-align: center;
  padding: 2rem 1rem;
}
hr {
  border: 0;
  height: 1px;
  background: rgba(128, 128, 128, 0.25);
  margin: 2rem auto;
  width: 50%;
}`
  );

  // 4. OEBPS/nav.xhtml
  oebps.file(
    'nav.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es">
<head>
  <meta charset="utf-8" />
  <title>Tabla de Contenidos</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Índice de Contenidos</h1>
    <ol>
      <li><a href="chapter1.xhtml">Prólogo y Dedicatoria</a></li>
      <li><a href="chapter2.xhtml">Capítulo I: El dibujo del sombrero</a></li>
      <li><a href="chapter3.xhtml">Capítulo II: Por favor... ¡dibújame un cordero!</a></li>
      <li><a href="chapter4.xhtml">Capítulo XXI: El secreto del Zorro</a></li>
    </ol>
  </nav>
</body>
</html>`
  );

  // 5. OEBPS/chapter1.xhtml
  oebps.file(
    'chapter1.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta charset="utf-8" />
  <title>Prólogo y Dedicatoria</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <div class="center-box">
    <h1>El Principito</h1>
    <div class="subtitle">Por Antoine de Saint-Exupéry</div>
  </div>

  <h2>A León Werth</h2>

  <p>Pido perdón a los niños por haber dedicado este libro a una persona grande. Tengo una seria razón para ello: esta persona grande es el mejor amigo que tengo en el mundo. Tengo otra razón, y es que esta persona grande es capaz de comprenderlo todo, incluso los libros para niños.</p>

  <p>Tengo una tercera razón: esta persona grande vive en Francia, donde pasa hambre y frío. Tiene verdadera necesidad de consuelo. Si todas estas razones no fueran suficientes, quiero dedicar este libro al niño que esta persona grande fue en otro tiempo. Todas las personas grandes han sido niños antes (pero pocas lo recuerdan).</p>

  <blockquote>
    «Corrijo, pues, mi dedicatoria: A León Werth, cuando era niño.»
  </blockquote>
</body>
</html>`
  );

  // 6. OEBPS/chapter2.xhtml
  oebps.file(
    'chapter2.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta charset="utf-8" />
  <title>Capítulo I</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <h2>Capítulo I</h2>
  <div class="subtitle">El dibujo de la boa y el sombrero</div>

  <p>Pido perdón a los niños, pero cuando yo tenía seis años vi en un libro sobre la selva virgen, que se titulaba «Historias vividas», una magnífica lámina. Representaba una serpiente boa que se tragaba a una fiera.</p>

  <p>El libro decía: «Las serpientes boas tragan a sus presas enteras, sin masticarlas. Luego no pueden moverse y duermen durante los seis meses que dura su digestión». Reflexioné mucho sobre las aventuras de la selva y, a mi vez, logré trazar con un lápiz de color mi primer dibujo. Mi dibujo número 1.</p>

  <p>Enseñé mi obra de arte a las personas mayores y les pregunté si mi dibujo les daba miedo.</p>

  <blockquote>
    «—¿Por qué habría de dar miedo un sombrero? —me respondieron.»
  </blockquote>

  <p>Mi dibujo no representaba un sombrero. Representaba una serpiente boa que digería un elefante. Dibujé entonces el interior de la serpiente boa a fin de que las personas mayores pudieran comprender. Siempre necesitan explicaciones.</p>
</body>
</html>`
  );

  // 7. OEBPS/chapter3.xhtml
  oebps.file(
    'chapter3.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta charset="utf-8" />
  <title>Capítulo II</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <h2>Capítulo II</h2>
  <div class="subtitle">En el desierto del Sahara</div>

  <p>Viví así, solo, sin nadie con quien hablar verdaderamente, hasta que tuve una avería en el desierto del Sahara hace seis años. Algo se había roto en mi motor. Y como no llevaba conmigo ni mecánico ni pasajeros, me dispuse a realizar, solo, una difícil reparación. Era para mí una cuestión de vida o muerte: apenas tenía agua para beber durante ocho días.</p>

  <p>La primera noche me dormí sobre la arena, a mil millas de toda tierra habitada. Estaba más aislado que un náufrago en una balsa en medio del océano. Imaginaos, pues, mi sorpresa cuando, al romper el día, me despertó una extraña vocecita que decía:</p>

  <blockquote>
    «—Por favor... ¡dibújame un cordero!<br/>
    —¿Eh?<br/>
    —Dibújame un cordero...»
  </blockquote>

  <p>Me puse en pie de un salto, como herido por el rayo. Me froté los ojos. Miré bien. Y vi a un hombrecito extraordinario que me examinaba con gravedad.</p>
</body>
</html>`
  );

  // 8. OEBPS/chapter4.xhtml
  oebps.file(
    'chapter4.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta charset="utf-8" />
  <title>Capítulo XXI</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <h2>Capítulo XXI</h2>
  <div class="subtitle">El secreto esencial</div>

  <p>Fue entonces cuando apareció el zorro:</p>

  <p>—Buenos días —dijo el zorro.<br/>
  —Buenos días —respondió cortésmente el principito, que se dio la vuelta pero no vio nada.<br/>
  —Estoy aquí —dijo la voz—, bajo el manzano.<br/>
  —¿Quién eres tú? —dijo el principito—. Eres muy bonito...<br/>
  —Soy un zorro —dijo el zorro.<br/>
  —Ven a jugar conmigo —le propuso el principito—. ¡Estoy tan triste!...<br/>
  —No puedo jugar contigo —dijo el zorro—. No estoy domesticado.</p>

  <p>—¿Qué significa "domesticar"? —preguntó el principito.<br/>
  —Es algo demasiado olvidado —dijo el zorro—. Significa "crear lazos"...</p>

  <p>—¿Crear lazos?<br/>
  —Desde luego —dijo el zorro—. Para mí, todavía no eres más que un muchachito semejante a cien mil muchachitos. Y no te necesito. Y tú tampoco me necesitas. Para ti, no soy más que un zorro semejante a cien mil zorros. Pero si me domesticas, tendremos necesidad el uno del otro. Serás para mí único en el mundo. Seré para ti único en el mundo...</p>

  <hr />

  <blockquote>
    «He aquí mi secreto. Es muy simple: solo con el corazón se puede ver bien; lo esencial es invisible para los ojos.»
    <div class="quote-author">— El Zorro al Principito</div>
  </blockquote>
</body>
</html>`
  );

  // 9. OEBPS/content.opf
  oebps.file(
    'content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>El Principito</dc:title>
    <dc:creator>Antoine de Saint-Exupéry</dc:creator>
    <dc:language>es</dc:language>
    <dc:identifier id="BookID">urn:uuid:lumina-el-principito-sample</dc:identifier>
    <dc:description>Edición clásica de muestra de El Principito con capítulos destacados y reflexiones.</dc:description>
    <meta property="dcterms:modified">2026-01-01T12:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter3" href="chapter3.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter4" href="chapter4.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
    <itemref idref="chapter3"/>
    <itemref idref="chapter4"/>
  </spine>
</package>`
  );

  // Generate binary blob
  const content = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip'
  });

  return {
    id: 'sample-el-principito',
    title: 'El Principito',
    author: 'Antoine de Saint-Exupéry',
    description: 'Edición clásica de muestra con capítulos seleccionados y el secreto del zorro.',
    blob: content,
    addedDate: Date.now(),
    lastRead: Date.now(),
    progress: 0,
    isSample: true
  };
}
