**Langues :** [English](./README.md) · [简体中文](./README.zh-Hans.md) · [繁體中文](./README.zh-Hant.md) · [Español](./README.es.md) · [Français](./README.fr.md) · [日本語](./README.ja.md)

# Après la gravure · MiniDisc Label Studio

Un éditeur d'étiquettes statique pour minidisques : interface en six langues, zéro
dépendance à l'exécution, conçu pour une impression exacte à 300 DPI sur papier au format
SELPHY. Toutes les pochettes et projets restent sur votre machine — pas de serveur, pas de
statistiques, aucune requête externe de polices. La recherche optionnelle de métadonnées en
ligne est désactivée par défaut ; une fois activée, vos termes de recherche sont envoyés
directement au fournisseur choisi. [Ouvrir le site](https://bithostgits.github.io/md-label-studio/).

Le code est une implémentation indépendante. Le logo original MiniDisc est conservé comme
ressource distincte dont les droits restent à son titulaire ; voir
`THIRD-PARTY-NOTICES.txt`.

## Fonctionnalités principales

- **Quatre jeux d'étiquettes indépendants (A/B/C/D)** : album, artiste, année, pochette,
  polices, thème, majuscules, en-tête masqué et dimensions pour chaque jeu. Par défaut,
  quatre jeux sont imprimés par feuille ; la disposition classique à deux jeux A/B reste
  disponible et basculer ne perd jamais C/D.
- **Géométrie d'origine** : faces 38×54 mm, en-tête 5 mm, pochette 38×38 mm ; tranches
  58×3,5 mm. Chaque étiquette générée comporte des **traits de coupe de 0,10 mm**.
- **Export 300 DPI** : feuille quatre jeux 100×148 mm → 1181×1748 px ; faces en
  millimètres réels 449×638 et tranches 685×41 ; mode compatible historique 448×637 ;
  mire de calibration bi-axe non corrigée. Toutes avec `pHYs` = 11811 px/m.
- **Marques Hi-MD optionnelles** par jeu (marque horizontale sur la face à côté du logo
  MiniDisc et barre sur la tranche, alignée à droite), utilisant le véritable logotype
  Hi-MD, droits réservés.
- **Interface en six langues** (anglais par défaut, 简体中文, 繁體中文, Español, Français,
  日本語) avec des polices hors ligne adaptées à chaque langue ; changer de langue ne
  modifie ni le contenu des étiquettes ni les octets exportés.
- **Recherche d'albums en ligne optionnelle** (désactivée par défaut) : recherche en deux
  étapes via MusicBrainz ou suggestions iTunes en métadonnées seules, progression par étape
  avec boutons de reprise indépendants, import optionnel de pochettes depuis Cover Art
  Archive avec avertissements de résolution, envoi manuel toujours possible. Requêtes
  directes du navigateur au fournisseur uniquement : ni proxy ni clés.
- Sauvegarde/chargement local de projets JSON v2 (quatre jeux avec pochettes importées),
  compatible avec les anciens projets à deux jeux.

## Exécution en local

Depuis `app/` (ou la racine de l'archive décompressée) :

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Ouvrez `http://127.0.0.1:8080/`. N'ouvrez pas via `file://` (les modules ES et les
manifestes de polices sont bloqués). `npm install` n'est pas nécessaire. Tests de
développement : `npm test`, `npm run test:browser`, `npm run test:fixes`,
`npm run test:logo`, `npm run test:four-set`, `npm run test:spine`, `npm run test:himd`,
`npm run test:i18n`, `npm run test:autocomplete`. Construction : `npm run build` (copie les
fichiers autorisés vers `dist/` avec un manifeste SHA-256).

## Notes d'impression

- La feuille par défaut est de **100×148 mm finis** (pas 100×177 avec marges détachables).
  Ancres des faces : A(9,6), B(53,6), C(9,62), D(53,62) ; tranches en x21,
  y118/123.5/129/134.5. Marge de sécurité d'au moins 6 mm ; les dispositions
  personnalisées invalides sont refusées, jamais réduites automatiquement.
- Option 4×6 pouces réels (101,6×152,4 mm → 1200×1800 px) ; sans prétendre qu'il s'agit de
  papier SELPHY.
- La calibration n'est pas corrigée par défaut : imprimez la mire, mesurez puis appliquez
  `facteur = 50 / mesuré`. Sans impression d'essai, l'ajustement physique n'est pas
  garanti.

## Droits et différences

Code écrit de façon indépendante (MIT pour l'application ; illustrations d'exemple
originales également MIT). Le logo original MiniDisc et les marques Hi-MD sont des
ressources distinctes dont les droits de marque/image restent à leur titulaire (associé à
Sony) ; aucune permission de redistribution n'est revendiquée. La police Futura du site
d'origine est remplacée par Atkinson sous licence OFL ; les polices CJK sont des polices
hors ligne sous OFL. Les neuf polices incluses totalisent 23,43 Mio avec les licences
complètes dans `assets/fonts/`. Aucune revendication d'identité au pixel près avec le site
d'origine. Les sources des dimensions (Elecom/A-one/SWHarden) sont liées dans le rapport de
recherche ; ces liens ne sont visités qu'au clic.

Les autres traductions sont dans la navigation des langues ci-dessus.
