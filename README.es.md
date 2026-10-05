**Idiomas:** [English](./README.md) · [简体中文](./README.zh-Hans.md) · [繁體中文](./README.zh-Hant.md) · [Español](./README.es.md) · [Français](./README.fr.md) · [日本語](./README.ja.md)

# Después de la grabación · MiniDisc Label Studio

Un editor de etiquetas estático para Minidiscs: interfaz en seis idiomas, cero dependencias
en tiempo de ejecución y diseñado para impresión exacta a 300 DPI en papel tamaño SELPHY.
Todas las portadas y proyectos permanecen en tu equipo: sin servidor, sin analíticas y sin
peticiones externas de fuentes. La consulta opcional de metadatos en línea está desactivada
por defecto; al activarla, los términos que escribas se envían directamente al proveedor que
elijas. [Abrir el sitio](https://bithostgits.github.io/md-label-studio/).

El código es una implementación independiente. El logotipo original de MiniDisc se conserva
como recurso separado con derechos reservados a su titular; consulta
`THIRD-PARTY-NOTICES.txt`.

## Características principales

- **Cuatro juegos independientes de etiquetas (A/B/C/D)**: álbum, artista, año, portada,
  fuentes, tema, mayúsculas, cabecera oculta y tamaños por juego. Por defecto se imprimen
  cuatro juegos por hoja; el diseño clásico de dos juegos A/B sigue disponible y alternar
  nunca pierde C/D.
- **Geometría original**: carátulas 38×54 mm, cabecera 5 mm, portada 38×38 mm; lomos
  58×3,5 mm. Cada etiqueta generada incluye **líneas de corte de 0,10 mm**.
- **Exportación a 300 DPI**: hoja de cuatro juegos 100×148 mm → 1181×1748 px; carátulas en
  milímetros reales 449×638 y lomos 685×41; modo compatible histórico 448×637; hoja de
  calibración de doble eje sin compensar. Todas con `pHYs` = 11811 px/m.
- **Marcas Hi-MD opcionales** por juego (marca horizontal en la carátula junto al logotipo
  MiniDisc y barra en el lomo, alineada a la derecha), con el logotipo genuino de Hi-MD y
  derechos reservados.
- **Interfaz en seis idiomas** (inglés por defecto, 简体中文, 繁體中文, Español, Français,
  日本語) con fuentes sin conexión apropiadas por idioma; cambiar de idioma nunca altera el
  contenido de las etiquetas ni los bytes exportados.
- **Consulta opcional de álbumes en línea** (desactivada por defecto): búsqueda en dos
  etapas con MusicBrainz o sugerencias solo de metadatos de iTunes, progreso por etapas con
  botones de reintento independientes, importación opcional de portadas de Cover Art Archive
  con avisos de resolución, y carga manual siempre disponible. Solo peticiones directas del
  navegador al proveedor: sin proxy ni claves.
- Guardado/carga local de proyectos JSON v2 (cuatro juegos con portadas subidas),
  compatible con proyectos antiguos de dos juegos.

## Ejecución local

Desde `app/` (o la raíz del paquete descomprimido):

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Abre `http://127.0.0.1:8080/`. No lo abras con `file://` (el navegador bloquea los módulos
ES y los manifiestos de fuentes). No necesita `npm install`. Pruebas de desarrollo:
`npm test`, `npm run test:browser`, `npm run test:fixes`, `npm run test:logo`,
`npm run test:four-set`, `npm run test:spine`, `npm run test:himd`, `npm run test:i18n`,
`npm run test:autocomplete`. Compilación: `npm run build` (copia los archivos permitidos a
`dist/` con un manifiesto SHA-256).

## Notas de impresión

- La hoja por defecto es de **100×148 mm acabados** (no 100×177 con márgenes de rasgado).
  Anclas de carátula: A(9,6), B(53,6), C(9,62), D(53,62); lomos en x21, y118/123.5/129/134.5.
  Margen de seguridad de al menos 6 mm; los diseños personalizados no válidos se rechazan,
  nunca se reducen automáticamente.
- Opción de 4×6 pulgadas reales (101,6×152,4 mm → 1200×1800 px); no se afirma que sea papel
  SELPHY.
- La calibración no está compensada por defecto: imprime la hoja de prueba, mide y aplica
  `factor = 50 / medido`. Sin impresión de prueba no se garantiza el ajuste físico.

## Derechos y diferencias

Código escrito de forma independiente (MIT para la aplicación; las ilustraciones de ejemplo
originales también MIT). El logotipo original de MiniDisc y las marcas Hi-MD son recursos
separados cuyos derechos de marca/imagen permanecen con su titular (asociado a Sony); no se
afirma ningún permiso de redistribución. La fuente Futura del sitio original se sustituye
por Atkinson con licencia OFL; las fuentes CJK son fuentes sin conexión bajo OFL. Las nueve
fuentes incluidas suman 23,43 MiB con licencias completas en `assets/fonts/`. No se afirma
compatibilidad píxel a píxel con el sitio original. Las fuentes de dimensiones
(Elecom/A-one/SWHarden) están enlazadas en el informe de investigación; esos enlaces solo se
visitan al hacer clic.

Las demás traducciones están en la navegación de idiomas de arriba.
