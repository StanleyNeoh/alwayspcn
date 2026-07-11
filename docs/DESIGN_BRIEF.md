# Design Brief: AlwaysPCN

**Version:** 1.1  
**Status:** Implementation-Ready  
**Last Updated:** 2026-07-11  

---

## 1. Concept

AlwaysPCN is a cartographic dashboard, not a generic map clone. It should feel like an
urban transit instrument panel: purposeful, legible, and confident in its visual language.
The dominant element is always the map. Controls are compact, precise, and never compete
with the spatial data.

---

## 2. Visual Direction

### 2.1 Tone and Mood
- Informed and precise — a tool for people who know what they want.
- Calm and cartographic — understated backgrounds, deliberate colour use.
- Not playful, not corporate. Closer to a cycling computer than a consumer app.

### 2.2 Background and Surface
- Light mode only in v1.
- Map basemap: OpenStreetMap light tiles (CartoDB light or standard OSM).
- UI surfaces: off-white (`zinc-50` / `#fafafa`) with `zinc-100` borders.
- Panel shadows: subtle (`shadow-sm` Tailwind), never dramatic.

### 2.3 Route and Overlay Colour Scale

**PCN route kinds:**
| Kind             | Colour           | Hex       |
|------------------|------------------|-----------|
| park_connector   | Emerald          | `#10b981` |
| park_path        | Teal             | `#14b8a6` |
| cycling_path     | Sky              | `#0ea5e9` |
| rail_corridor    | Violet           | `#8b5cf6` |
| other            | Stone            | `#78716c` |

**Active computed route:** Cyan `#06b6d4`, stroke weight 5 px, opacity 0.9.

**OSM highway class colour scale:**
| Class             | Colour      |
|-------------------|-------------|
| motorway/trunk    | Red         |
| primary           | Orange      |
| secondary         | Amber       |
| tertiary          | Yellow      |
| residential       | Light grey  |
| path/footway      | Very light grey |

---

## 3. Typography

### 3.1 Type Scale
- **Display / Heading:** `font-semibold`, `text-xl` (card headers) to `text-2xl` (page title).
- **Body / Labels:** `text-sm`, `font-normal`, `text-zinc-600`.
- **Mono / Stats:** `font-mono text-sm` for distance and coordinate display.
- **Caption:** `text-xs text-zinc-500` for legend labels and secondary metadata.

### 3.2 Font Stack
- System sans-serif stack (Tailwind default): `ui-sans-serif, system-ui, -apple-system, ...`
- No custom web fonts loaded in v1; prioritise rendering performance.

---

## 4. UI Component Inventory

All interactive controls use **shadcn/ui** components. Do not introduce an alternative
component library without explicit justification.

| Component         | Role                                                |
|-------------------|-----------------------------------------------------|
| `Card`            | Control panel wrapper (start/end inputs + button)  |
| `Input`           | Start and end location text fields                 |
| `Button`          | "Route" / "Apply / Locate" submit control          |
| `Badge`           | Distance, connector %, fallback warning             |
| `LocationCombobox`| Geocoded location autocomplete input               |
| Leaflet map       | Map canvas (not a shadcn component)                |
| Legend panel      | Custom div overlay anchored to map bottom-right    |

### 4.1 Icons
- Use `lucide-react` exclusively. Current usage: `Navigation2`, `Search`, `Loader2`.
- No icon font or SVG sprite sheets.

---

## 5. Layout

### 5.1 Page Structure
```
+----------------------------------------------+
|  [AlwaysPCN header / title]                  |
+----------------------------------------------+
|  [Control Panel Card]    |                   |
|  Start input             |   Leaflet Map     |
|  End input               |   (fills viewport)|
|  Route button            |                   |
|  Result badges           |                   |
+--------------------------+                   |
                           |  [Legend overlay] |
                           +-------------------+
```

### 5.2 Map Positioning
- Map fills available viewport height (100vh minus header).
- Control panel is positioned as an overlay on the left of the map at desktop widths.
- At < 640 px (mobile), control panel stacks above the map.

### 5.3 Responsive Breakpoints
| Breakpoint | Behaviour                                              |
|------------|--------------------------------------------------------|
| < 640 px   | Panel above map; map height 60 vh                     |
| 640–1023 px | Panel overlay left; map fills remainder               |
| ≥ 1024 px  | Panel overlay left; map fills viewport                |

---

## 6. Motion and Animation

### 6.1 Policy
- Tailwind CSS `transition` utilities are the default for all state changes.
- Motion (framer-motion/motion) is **not** installed in v1.
- Add Motion only if a specific interaction requirement cannot be satisfied with Tailwind transitions.

### 6.2 Permitted Animations (Tailwind only)
| Element            | Animation                                    |
|--------------------|----------------------------------------------|
| Route stats reveal | `transition-opacity duration-300`            |
| Button loading state | Spinner (`Loader2` icon with `animate-spin`) |
| Badge appearance   | `transition-all duration-200`               |

---

## 7. Accessibility

### 7.1 Requirements (WCAG 2.1 AA)
- All interactive controls must have visible focus rings (use Tailwind `focus-visible:ring-2`).
- Input fields must have associated `<label>` elements.
- Route result section must use `role="status"` or `aria-live="polite"` for screen reader updates.
- Map container: `aria-label="Route map"`.
- Badge components must have descriptive `aria-label` when icon-only.
- Colour is not used as the sole indicator of status (fallback warning uses text + colour).

### 7.2 Keyboard Navigation
- Tab order: Start input → End input → Route button → (map is keyboard-excluded in v1).
- Enter key submits the route form.

---

## 8. Error and Empty States

| State                  | Treatment                                                    |
|------------------------|--------------------------------------------------------------|
| Graph not loaded       | Spinner in map centre; "Loading network..." text             |
| Geocoding failure      | Red helper text beneath input: "Could not locate place name" |
| No route found         | Card shows "No route found. Try points within the PCN area." |
| Start/end not set      | Route button disabled with grey state                        |
| Build script failure   | App renders without overlay; console warning logged          |

---

## 9. Design Debt and v2 Targets

- Dark mode palette (high-contrast map tiles + inverted UI surfaces).
- Mobile-first responsive redesign with bottom sheet control panel.
- Custom PCN map tiles replacing OSM basemap for brand consistency.
- Animated route reveal (polyline draw-on animation using Motion).
- Micro-interaction: coordinate pin drop on geocode success.

