# New Findings

Bugs and concerns discovered outside the scope of
`docs/audits/2026-04-phase-audit.md`, logged here rather than fixed
so the phased remediation plan stays focused.

Add an entry per finding:
- Short title
- Where found (file / command / context)
- Severity (use the same scale as the audit)
- What's wrong and the user impact
- Any workaround you noticed

---

## NF-1 — GitHub PAT embedded in origin remote URL
- **Where:** `git remote -v` output during Phase 1 pre-flight.
  The origin URL contains a plaintext token of the form
  `https://ghp_O703…@github.com/faceless-truth/loopd_In.git`.
- **Severity:** High (security, not a runtime bug).
- **Impact:** Anyone with access to the developer's shell history,
  terminal scrollback, CI logs, or a `.git/config` copy can clone and
  push as the token's owner. The token appeared in pre-flight tool
  output in this session.
- **User action taken:** User acknowledged during Phase 1 kickoff and
  is rotating the PAT out-of-band.
- **Recommended follow-up:** After rotation, switch the origin URL to
  SSH or use a credential helper so the token never lives in
  `.git/config`.

## NF-2 — ESLint baseline on origin/main has 10 errors
- **Where:** `pnpm lint` against the Phase 1 baseline (origin/main @
  41716f7).
- **Severity:** Low (code quality / CI hygiene, not a runtime bug).
- **Impact:** `pnpm lint` exits with code 1 before any Phase 1 change.
  Categories of the pre-existing errors:
  - `react/no-unescaped-entities` in login screen, profile tab, habit
    create, photo-proof sheet (apostrophes and quotes in JSX text).
  - `react-hooks/rules-of-hooks` in `app/onboarding.tsx:61` —
    `useRef()` called inside `STEPS.map()`. Passes at runtime only
    because STEPS.length is a module constant. This is L9 in the
    audit.
- **Phase 1 handling:** Phase 1 commits were verified to not increase
  the error count (still 10 errors, 24 warnings after each commit).
  These pre-existing errors were not fixed because they are outside
  the audit scope for Phase 1 (C1–C5).
- **Recommended follow-up:** Batch the apostrophe/quote fixes into a
  small chore commit during Phase 9 (Lows review), and decide whether
  to relocate the `useRef` in onboarding or accept it per L9.

## NF-3 — `app/profile/[userId]` Stack.Screen registered but file missing
- **Where:** `app/_layout.tsx:146` declares `<Stack.Screen name="profile/[userId]" />`
  but `app/profile/` contains only `setup.tsx` on origin/main.
- **Severity:** Low today (no caller navigates to
  `/profile/<id>` — grep of `app/` confirms).
- **Impact:** Harmless at runtime. Becomes a crash the moment anyone
  wires up an avatar tap → profile view. Called out in audit as
  "feature not wired up", not a runtime bug.
- **Recommended follow-up:** Either implement the profile view screen
  or remove the orphan Stack.Screen line.

## NF-4 — `PhotoProofSheet` uses `react-native` directly, breaking vitest SSR transform when re-exported through `lib/`
- **Where:** Discovered while implementing C3. Vitest's SSR transform
  couldn't parse `react-native` (Flow/JSX in published source) when
  `tests/*.test.ts` transitively imported any module that touched
  `react-native`.
- **Severity:** Medium (testing infrastructure), but contained by the
  workaround used in C3.
- **Workaround taken:** Split `lib/storage-url.ts` (runtime wrapper
  that imports `react-native`) from `shared/storage-url.ts` (pure
  logic). Tests import only `shared/`.
- **Recommended follow-up:** If future phases need to unit-test more
  UI-adjacent helpers, consider adding a proper vitest config with
  `resolve.alias` for `react-native` → a stub, so RN-touching modules
  can be tested without the split. Not urgent; the convention "pure
  in shared/, runtime in lib/" is clean on its own.
