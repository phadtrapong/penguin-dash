# TODOS

## Design Debt

### Color-blind accessibility for skin palette
- **What:** Lava Penguin (#e53935) and Forest Penguin (#2E7D32) are a red/green pair, indistinguishable for ~8% of males with color vision deficiency. Adjust one or both colors, or add a shape/pattern differentiator (e.g., stripe on the belly).
- **Why:** The plan explicitly calls out color-blind safety for skins, but the current color table violates it.
- **Pros:** Inclusive design for the target audience (kids, some of whom are color-blind).
- **Cons:** Minor effort to adjust 1-2 hex values.
- **Context:** From /plan-design-review Pass 6. The skin unlock table in the design doc has the exact colors. Change Lava to a warmer orange (#FF6D00) or Forest to a teal (#00897B) to create brightness contrast.
- **Depends on:** Skin implementation (Phase 1, item 1 of design doc).

## Engineering Debt

### Penguin skin materials must NOT use shared material cache
- **What:** When implementing the material cache (eng review Issue 8) and parameterized createPenguin (Issue 3), penguin body/belly/beak materials must be created fresh per skin, not pulled from the shared cache. Skin colors change per player selection; caching them would cause non-penguin objects sharing that color to change appearance when skins switch.
- **Why:** Material cache and skin system interact in meshes.ts. Using the cache for penguin parts would create a subtle visual bug.
- **Pros:** Prevents incorrect color sharing between penguin and world objects.
- **Cons:** Penguin parts (~6 materials) don't benefit from caching. Negligible impact (one object).
- **Context:** From /plan-eng-review Issue 3 + Issue 8 interaction. The shared cache should use `_flatMat()` for world objects (tiles, floes, trees, rocks, seals, fish). createPenguin() should create materials directly without the cache.
- **Depends on:** Material cache implementation + parameterized createPenguin implementation.
