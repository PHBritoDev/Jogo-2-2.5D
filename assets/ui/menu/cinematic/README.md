# Cinematic layers — original art, 17/11/2026

The creator explicitly authorized generated imagery in the conversation on 17/11. These two original assets were made for this project with the image-generation tool, directed by the supplied reference. They are not that reference bitmap and contain no UI, lettering or clickable baked controls.

- `environment.webp`: pearl angel, organic storm demon, fractured carved arch, deep cathedral ruins, waterfalls and foreground stair terrace. 1672×941.
- `worlds-hero.webp`: transparent 4×2 atlas. Top row: Ganância, Inveja, Avareza, Soberba. Bottom row: Gula, Ira, Luxúria, hooded hero viewed from behind. 1774×887.

Sources were generated as PNG (`exec-01e4915d-ff88-4c43-8d2d-20d776206e63.png`, `exec-530b197d-b956-4050-b020-a8f275cfbcf7.png`) and encoded as WebP quality 94 with Pillow, without retouching or copying the reference. Generation is nondeterministic; the shipped files are the source of truth. No online generation or art service is contacted by the game.

## Runtime contract

This is **layered 2.5D artwork**, not a claim that the painted cathedral landscape or angel is a fully modeled GLB. The seven worlds are distinct curved relief meshes with atlas UVs, actual limited Y rotation, independent float and selection interpolation. Iron links remain instanced 3D geometry and track the live worlds. The hero is a separate subdivided mesh: only the cape region receives wind displacement; the head, sword and body remain fixed. Feather tips and atmospheric layers have restrained movement. One existing renderer/canvas handles everything.

The HTML keeps the canonical IDs, labels, access requirements, coins, real progress, settings and entry callback. Without WebGL, the same separate art regions and SVG suspension remain behind those controls. If art fails to load, the independent GLB/CC0 geometric scene remains available. Original GLBs and gameplay are unchanged.

The pair totals approximately 1.1 MiB. Textures are shared across the seven worlds and hero; no extra renderer or post-processing passes. The old heavy GLBs/HDR are loaded only when the art is unavailable. Reduced motion freezes nonessential movement; tab hiding and teardown stop the loop and release resources.
