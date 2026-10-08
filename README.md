# Grand Remix · DMTeam

Site et maquette 3D du Grand Remix au Ministère.

Site publié : https://grand-remix-le-ministere.netlify.app/

## Dossiers

- `grand-remix-3d/` : code, réglages partagés, médias et tests.
- `grand-remix-3d/site/` : fichiers du site à publier sur Netlify.
- `pdf/grand_remix/` : PDF technique actuel et sources de génération.

## Reconstruire le site

Avec Node.js 22 ou plus récent :

```sh
cd grand-remix-3d
npm ci
node build.cjs
node build_site.cjs
```

Servir le dossier `site/` avec un serveur HTTP local pour utiliser la maquette.
Les cinq boucles vidéo optimisées et leurs licences/sources documentées sont
incluses, ainsi que les cinq vidéos sources pour reprendre le montage. Les
polices chargées par les animations sont conservées avec leurs licences.
Les caches, journaux et essais locaux sont exclus.
Les ambiances personnelles restent dans le navigateur ; leur transfert se fait
par les commandes Exporter et Importer de la maquette.

## Vérification

```sh
node check-lighting-persistence.mjs
node check-export-sequence.mjs
node check-fog-volume.mjs
node check-site-ux.mjs
node check-mobile-rendering.mjs
```

Les autres fichiers `check-*.mjs` couvrent les fonctions de rendu et de lecture.
Certains contrôles vidéo utilisent FFmpeg. La génération du PDF utilise Python,
ReportLab, pypdf et les polices Arial de Windows : exécuter
`pdf/grand_remix/build_plan_v18.py`, puis `grand-remix-3d/build-studio-appendix.py`.
Le suffixe du fichier PDF est un identifiant interne, absent de la mise en page.

Les dimensions et les accroches proposées restent à valider en salle avec le DT.

## Rendu sur téléphone et tablette

Le profil mobile détecte Android, iPhone et iPad (y compris Safari en mode
ordinateur). Il réduit les résolutions des ombres, des gobos et de la texture
vidéo, ainsi que les échantillons du brouillard volumétrique et des faisceaux.
Le rendu 3D est limité à un ratio de pixels de 1 et à 720 000 pixels, avec une
adaptation progressive si la cadence reste insuffisante. Les textes et les
commandes conservent leur résolution native. Les paramètres de scène, couleurs,
caméra, densité et dissipation du brouillard restent identiques.

Les PC, y compris tactiles ou dans une fenêtre étroite, conservent le profil
précédent. Les exports vidéo utilisent aussi le profil complet. Les tests
automatisés et les aperçus au format mobile ne remplacent pas une mesure sur
les téléphones et tablettes physiques.
