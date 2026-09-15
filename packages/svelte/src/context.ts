import type { IconScope } from "@icones/core"
// Svelte context value is a zero-arg getter, matching SSR-safe reactive scope propagation.
export const scopeKey = Symbol("icones.scope")
export type ScopeContext = () => IconScope
