# TODOS

## Design Debt

### Color-blind accessibility for skin palette
- Fixed by implementation on main, 2026-04-01. Lava=#FF6D00, Forest=#00897B.

## QA Findings (from /qa on main, 2026-04-01)

### Skin card buttons need aria-labels (medium, accessibility)
- **What:** Locked skin card buttons read as "Golden Penguin 🐟 10" — emoji may be read inconsistently by screen readers. Add explicit `aria-label` attributes like "Golden Penguin, costs 10 fish, locked".
- **Why:** Only the Pause button has an aria-label. Other interactive elements rely on text content which includes emojis.
- **Depends on:** None.

### THREE.Clock deprecation warning (low, console)
- **What:** `new THREE.Clock()` in Game.ts triggers "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead." on every page load.
- **Why:** Three.js deprecated Clock in favor of Timer. Will be removed in a future version.
- **Depends on:** None. Simple swap of `new THREE.Clock()` → `new THREE.Timer()` and updating delta calls.

### Skin grid Close button tight on 320px (low, visual)
- **What:** On 320x568 viewport, the Close button on the skins screen sits at the very bottom edge with minimal padding.
- **Why:** 3-column grid + 8 skin cards + heading + close button fills the full height.
- **Depends on:** None. Could add `overflow-y: auto` or reduce card padding at small sizes.

## Engineering Debt

### Penguin skin materials must NOT use shared material cache
- **What:** When implementing the material cache (eng review Issue 8) and parameterized createPenguin (Issue 3), penguin body/belly/beak materials must be created fresh per skin, not pulled from the shared cache. Skin colors change per player selection; caching them would cause non-penguin objects sharing that color to change appearance when skins switch.
- **Why:** Material cache and skin system interact in meshes.ts. Using the cache for penguin parts would create a subtle visual bug.
- **Pros:** Prevents incorrect color sharing between penguin and world objects.
- **Cons:** Penguin parts (~6 materials) don't benefit from caching. Negligible impact (one object).
- **Context:** From /plan-eng-review Issue 3 + Issue 8 interaction. The shared cache should use `_flatMat()` for world objects (tiles, floes, trees, rocks, seals, fish). createPenguin() should create materials directly without the cache.
- **Depends on:** Material cache implementation + parameterized createPenguin implementation.
