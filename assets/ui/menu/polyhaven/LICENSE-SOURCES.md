# Poly Haven — CC0 sources used by the menu

Downloaded 2026-11-16 through Poly Haven's public API. These are 3D meshes, PBR surface textures and a sky lighting environment; no reference artwork or asset-preview renders are included.

| Asset | Source | Menu derivative |
| --- | --- | --- |
| Rock Face 02 | https://polyhaven.com/a/rock_face_02 | Scanned cliff geometry reduced to 28%, 512px texture maps, `rock-menu.glb` |
| Modular Fort 01 | https://polyhaven.com/a/modular_fort_01 | Existing scanned wall/tower/gate modules, 512px WebP maps, shared geometry |
| Kloofendal 48d Partly Cloudy Puresky | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | 1K HDR, recolored cloud sky and PMREM reflections |

License: **CC0 1.0 Universal** — https://creativecommons.org/publicdomain/zero/1.0/ . Poly Haven's asset-license statement: https://polyhaven.com/license . CC0 permits modification, commercial use and redistribution; attribution is included for provenance. Poly Haven staff/contributing artists retain their credit; this project does not claim authorship of their source assets.

`sources.json` records each original URL and checksum. Textures are reduced to 512px WebP (quality 88); the rock derivative embeds JPEG maps. `tools/visual-lab/galaxy-menu-cc0-download.py` reproduces source downloads/checksums and texture conversion; `blender -b -t 2 --python tools/visual-lab/galaxy-menu-rock-export.py` reproduces the reduced rock. Blender 4.3.2 was used. Sources are bundled locally: opening the menu never contacts Poly Haven or a third-party model store.
