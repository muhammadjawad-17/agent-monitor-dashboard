<div align="center">

# ◆ Agent Monitor

### Observability for AI agent fleets — on your phone.

Which agents are healthy, what broke, how much it cost, and a trace you can
actually read at 2am. Built with Expo Router, React Native and strict TypeScript.

<br/>

[![Expo](https://img.shields.io/badge/Expo-57-0A0E17?style=for-the-badge&logo=expo&logoColor=EEF2FF)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.86-4F8CFF?style=for-the-badge&logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Zustand](https://img.shields.io/badge/Zustand-5-1A2233?style=for-the-badge)](https://zustand.docs.pmnd.rs)
[![Theme](https://img.shields.io/badge/Light_◐_Dark-F59E0B?style=for-the-badge)](#-light--dark)
[![Platforms](https://img.shields.io/badge/iOS_·_Android_·_Web-22C55E?style=for-the-badge)](#-run-it)

<br/>

**No backend. No API keys. Clone, install, run.**

</div>

---

## ✦ Highlights

|  | |
|---|---|
| 📊 **Fleet overview** | Six live metrics — agents online, runs today, error rate, p95 latency, spend, token burn. Anything degraded or failing is lifted into a **needs attention** section at the top, so the screen answers *"is anything on fire?"* before you scroll. |
| 📡 **Live telemetry** | A toggle drives a feed that ticks every 3s — advancing run counts, shifting the throughput window, jittering latency. Auto-pauses when the app backgrounds. |
| 🔍 **Per-agent drill-down** | Full-width throughput chart, six health statistics, recent run history. Tap any run to open its trace. |
| 🧵 **Run traces** | Relative-timestamp gutter, colour-coded log levels, tagged tool calls with individual durations, and the error that ended the run. |
| 🔔 **Alert rules** | Conditions, delivery channels, and fire counts for the week. Arm or disarm each rule from the phone. |
| ◐ **Light & dark** | Follows the OS by default, with an in-app toggle to override. Two hand-tuned palettes — not one inverted into the other. |
| 🎯 **Deterministic data** | Seeded fixtures — organic-looking, byte-identical on every launch. Screenshots stay stable. |

---

## ✦ Screens

```
Overview  →  Agents  →  Agent detail  →  Run trace
                ↑                            ↑
              Runs  ─────────────────────────┘
             Alerts
```

Four tabs (`Overview · Agents · Runs · Alerts`) plus two pushed detail routes.

---

## ✦ Light & dark

Both schemes are first-class. The app follows the OS setting on launch; the
sun/moon button on **Overview** overrides it and every surface re-tints
instantly.

Light is **not** dark inverted — a straight inversion produces glare and washed
out status colours. Two things are tuned per scheme:

| | Dark | Light |
|---|---|---|
| **Status colours** | `#22C55E` `#F59E0B` `#EF4444` | Deepened to `#15803D` `#B45309` `#DC2626` — the bright set fails contrast on white |
| **Elevation** | Borders — shadows are invisible on near-black | A soft shadow — borders nearly vanish on white |

Those two differences are themselves tokens (`shadowOpacity`, `tintAlpha`), so a
component asks the palette how to render rather than branching on the scheme.

---

## ✦ Run it

```bash
npm install
npx expo start
```

Then press <kbd>i</kbd> for the iOS simulator, <kbd>a</kbd> for Android, or scan
the QR code with Expo Go.

<details>
<summary><b>Other commands</b></summary>

<br/>

```bash
npm run ios          # expo run:ios      — native iOS build
npm run android      # expo run:android  — native Android build
npm run web          # expo start --web
npm run typecheck    # tsc --noEmit, strict mode

npx expo export --platform ios   # verify a production bundle builds
```

</details>

---

## ✦ Project structure

```
app/                          expo-router file-based routes
├─ _layout.tsx                ThemeProvider · root stack · gesture handler
├─ (tabs)/
│  ├─ _layout.tsx             bottom tab bar (Ionicons, inset-aware)
│  ├─ index.tsx               fleet overview + needs-attention
│  ├─ agents.tsx              searchable, filterable agent list
│  ├─ runs.tsx                run history with status filters
│  └─ alerts.tsx              alert rules
├─ agent/[id].tsx             per-agent drill-down
└─ run/[id].tsx               run trace viewer

src/
├─ components/ui.tsx          Card · Pill · StatusDot · Sparkline
│                             Loading/Empty/Error states · formatters
├─ store/useFleetStore.ts     Zustand store + selectors
├─ hooks/useLiveTelemetry.ts  the 3s telemetry feed
├─ services/mockData.ts       seeded deterministic fixtures
├─ theme/
│  ├─ index.ts                light + dark palettes · spacing · radius · type
│  └─ ThemeContext.tsx        ThemeProvider · useTheme · useThemedStyles
└─ types/index.ts             Agent · Run · LogEntry · AlertRule · FleetMetrics

assets/                       app icon, splash, adaptive + monochrome icons
app.json                      Expo config — scheme `agentmonitor`
tsconfig.json                 strict mode
.gitignore                    build output, native dirs, env files
```

<sub>~2,900 lines of TypeScript across 15 source files.</sub>

<details>
<summary><b>What's ignored</b></summary>

<br/>

`android/` and `ios/` are generated by `expo prebuild` (or `npm run ios` /
`npm run android`) and are not committed — the project stays a managed Expo app,
and anyone cloning it regenerates them from `app.json`.

```gitignore
node_modules/
.expo/
dist/
web-build/
*.log
.DS_Store
.env
.env.local

# Generated by expo prebuild — regenerate, don't commit
android/
ios/

# Local tooling
.claude/
```

</details>

---

## ✦ How it's built

**State — `store/useFleetStore.ts`**
Zustand, with selectors exported as plain functions
(`selectFilteredAgents`, `selectFleetMetrics`, `selectRunsForAgent`,
`selectRecentFailures`). Components subscribe to the raw slices and derive
through `useMemo`, so an unrelated telemetry tick doesn't re-render the tree.

Deriving *outside* the subscription is deliberate. Zustand compares a selector's
result by reference, and these build a new object each call — so subscribing to
one directly reads as "changed" on every render and loops until React bails out
with `Maximum update depth exceeded`. Each selector takes only the slice it
reads (`{ agents }`, `{ runs }`), which keeps the memo deps honest.

**Charts — `components/ui.tsx`**
The sparkline is hand-rolled SVG rather than a charting dependency — ~50 lines
that build an `M/L` path from the series, add a gradient-filled area underneath,
and pad two pixels so the stroke never clips at the bounds. It scales to its own
min/max and renders at whatever size the caller asks for. Used at three sizes
across the app.

**Fixtures — `services/mockData.ts`**
Generated from a seeded linear congruential generator. Daytime throughput bumps,
believable failure distributions — but identical on every launch. No flaky
"sometimes the chart is empty."

**Theming — `theme/ThemeContext.tsx`**
Styles can't live at module scope once they depend on a palette —
`StyleSheet.create` evaluates once at import and would never see a theme change.
Each file exports a `makeStyles(colors)` factory instead, and `useThemedStyles`
memoises the result per scheme, so the per-render cost stays a cache lookup:

```tsx
const makeStyles = (colors: Colors) =>
  StyleSheet.create({ screen: { backgroundColor: colors.bg } });

function Screen() {
  const styles = useThemedStyles(makeStyles);   // rebuilt only when the scheme flips
}
```

<table>
<tr>
<td align="center">🟩<br/><sub><code>healthy</code></sub></td>
<td align="center">🟨<br/><sub><code>degraded</code></sub></td>
<td align="center">🟥<br/><sub><code>failing</code></sub></td>
<td align="center">⬜<br/><sub><code>idle</code></sub></td>
<td align="center">🟦<br/><sub><code>accent</code></sub></td>
</tr>
</table>

**Types — `types/index.ts`**
Strict mode, zero `any`. Domain types live in one file that both the fixtures and
the store are checked against.

---

## ✦ Wiring it to a real backend

Three files change. **No screen changes.**

| # | File | Change |
|---|------|--------|
| 1 | `src/services/mockData.ts` | Becomes an API client. |
| 2 | `src/store/useFleetStore.ts` | `load` and `refresh` call it. Selectors and every component untouched. |
| 3 | `src/hooks/useLiveTelemetry.ts` | Replace the interval with a WebSocket subscription dispatching into the same `tick` reducer. |

That boundary is the point of the architecture — the UI never knows where the
data came from.

---

<div align="center">
<sub>MIT Licensed · Built as a portfolio project</sub>
</div>
