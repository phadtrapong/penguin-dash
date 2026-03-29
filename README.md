# Penguin Dash

An isometric 3D endless hopper. Hop across arctic ice floes, dodge seals, collect fish, and belly-slide your way to a high score.

**Play now:** [penguin-dash-blond.vercel.app](https://penguin-dash-blond.vercel.app)

## How to Play

- **Arrow keys / WASD** to hop forward, left, and right
- **Space** (hold) to belly-slide for speed
- **Swipe / Tap** on mobile
- Avoid falling in the water. Land on ice floes to cross rivers.
- Dodge the seals. Near-misses trigger slow-mo.
- Collect golden fish for bragging rights.

Score = furthest row reached. The game speeds up as you go.

## Tech

Built with:
- [Three.js](https://threejs.org/) for isometric 3D rendering (orthographic camera, voxel-style geometry)
- [Vite](https://vitejs.dev/) for dev server and production build
- TypeScript
- Web Audio API for procedural sound effects (no audio files)
- Zero external assets, everything is procedural geometry and code

## Run Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Build

```bash
npm run build
```

Output goes to `dist/`. Static HTML/JS/CSS, deployable anywhere.

## Project Structure

```
src/
  main.ts           Entry point
  style.css         UI styling
  game/
    Game.ts         Main game loop, camera, scene management
    constants.ts    Game tuning (speeds, colors, zones)
    types.ts        TypeScript interfaces
    meshes.ts       Voxel mesh creation (penguin, seal, tree, etc.)
    world.ts        Procedural world generation and collision detection
    input.ts        Keyboard and touch input handling
    audio.ts        Procedural Web Audio SFX
    ui.ts           Score display, high score, share button
```

## License

MIT
