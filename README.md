# Agent Monitor

An observability dashboard for AI agent fleets, built with Expo Router, React
Native and TypeScript.

If you run agents in production you need the same things you need from any other
production system: which ones are healthy, what broke, how much it cost, and a
trace you can actually read when something goes wrong. That is what this is.

![Expo](https://img.shields.io/badge/Expo-57-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)

---

## What it does

**Fleet overview.** Six live metrics across the whole fleet — agents online, runs
today, error rate, average p95 latency, spend and token burn. Anything degraded
or failing is pulled into a "needs attention" section at the top, so the screen
answers "is anything on fire" before you scroll.

**Live telemetry.** A toggle drives a simulated telemetry feed that ticks every
three seconds, advancing run counts, shifting the throughput window, and jittering
latency. It pauses automatically when the app backgrounds. In a real deployment
this hook is where the WebSocket subscription goes — the rest of the app does not
change.

**Per-agent drill-down.** Each agent has a full-width throughput chart, six health
statistics, and its recent run history. Tap any run to get its trace.

**Run traces.** A run trace shows a gutter of relative timestamps, colour-coded
log levels, tagged tool calls with their individual durations, and the error that
ended the run if it failed. This is the screen you actually open at 2am.

**Alert rules.** Five rules with conditions, delivery channels and how often each
has fired this week. Each can be armed or disarmed from the phone.

---

## The sparkline

The charts are a hand-rolled SVG component rather than a charting dependency —
about 50 lines that builds an `M/L` path from the data, adds a gradient-filled
area underneath, and pads two pixels so the stroke never clips at the bounds. It
takes any numeric series, scales to its own min and max, and renders at whatever
size the caller asks for. It is used at three different sizes across the app.

---

## Running it

```bash
npm install
npx expo start
```

Then press `i` for the iOS simulator, `a` for Android, or scan the QR code with
Expo Go.

```bash
npm run typecheck    # tsc --noEmit, strict mode
npx expo export --platform ios   # verify a production bundle builds
```

The app runs entirely against local fixtures — no backend, no keys, no setup.

---

## Architecture

```
app/                      expo-router file-based routes
  _layout.tsx             root stack, theme, gesture handler
  (tabs)/
    _layout.tsx           bottom tab bar
    index.tsx             fleet overview
    agents.tsx            searchable, filterable agent list
    runs.tsx              run history with status filters
    alerts.tsx            alert rules
  agent/[id].tsx          per-agent drill-down
  run/[id].tsx            run trace viewer

src/
  components/ui.tsx       Card, Pill, StatusDot, Sparkline, states, formatters
  store/useFleetStore.ts  Zustand store plus selectors
  hooks/                  useLiveTelemetry — the simulated feed
  services/mockData.ts    seeded deterministic fixtures
  theme/                  colour, spacing, radius, typography tokens
  types/                  Agent, Run, LogEntry, AlertRule, FleetMetrics
```

**State.** Zustand, with selectors exported as plain functions so each component
subscribes to the narrowest slice it needs and does not re-render on unrelated
telemetry ticks.

**Fixtures.** Generated from a seeded linear congruential generator, so the data
looks organic — daytime throughput bumps, believable failure distributions — but
is identical on every launch. Screenshots stay stable, and there is no flaky
"sometimes the chart is empty" behaviour.

**Types.** Strict mode, zero `any`, and the domain types live in one file that
both the fixtures and the store are checked against.

---

## Wiring it to a real backend

Three things change, all inside `src/`:

1. `services/mockData.ts` becomes an API client.
2. `store/useFleetStore.ts` — the `load` and `refresh` actions call it. The
   selectors and every component are untouched.
3. `hooks/useLiveTelemetry.ts` — replace the interval with a WebSocket
   subscription that dispatches into the same `tick` reducer.

No screen changes.
