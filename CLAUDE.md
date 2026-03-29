# Penguin Dash

Isometric 3D endless hopper built with Three.js + Vite + TypeScript.

## Build

```bash
npm install      # install dependencies
npm run dev      # vite dev server on :5173
npm run build    # tsc && vite build → dist/
```

## Project Structure

```
src/
  main.ts           Entry point, creates Game instance
  style.css         UI overlay styling (score, death screen, share button)
  game/
    Game.ts         Main game loop, scene, camera, update cycle
    constants.ts    Tuning params (speeds, colors, zone thresholds)
    types.ts        TypeScript interfaces (Row, GameData, FloeData, etc.)
    meshes.ts       Voxel mesh builders (penguin, seal, tree, rock, fish, tiles)
    world.ts        Procedural world gen, collision detection, moving objects
    input.ts        Keyboard (WASD/arrows/space) and touch (swipe/tap/long-press)
    audio.ts        Procedural Web Audio API SFX (no audio files)
    ui.ts           Score, high score (localStorage), death screen, share (Web Share API)
```

## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel
- Production URL: https://penguin-dash-blond.vercel.app
- Deploy workflow: `npx vercel --prod` (CLI deploy, no GitHub integration)
- Deploy status command: `npx vercel inspect`
- Merge method: squash
- Project type: web app (static site)
- Post-deploy health check: https://penguin-dash-blond.vercel.app

### Custom deploy hooks
- Pre-merge: `npm run build` (tsc + vite build)
- Deploy trigger: `npx vercel --yes --prod`
- Deploy status: `npx vercel inspect`
- Health check: `curl -sf https://penguin-dash-blond.vercel.app -o /dev/null -w "%{http_code}"`

### Notes
- GitHub integration not installed on Vercel. Deploys use CLI push, not auto-deploy on push.
- To enable auto-deploy: install the Vercel GitHub app at https://github.com/apps/vercel/installations/new
- Build output: ~510KB JS (Three.js), ~1.8KB CSS, ~1.3KB HTML
