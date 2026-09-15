<script lang="ts">
  import { getContext, setContext } from "svelte"
  import { createIconScopeResolver } from "@icones/core"
  import { scopeKey, type ScopeContext } from "./context"
  import type { IconConfigProps } from "./types"

  // Extract children and configuration options; children are rendered after context is set.
  let { children, ...options }: IconConfigProps = $props()
  const parent = getContext<ScopeContext | undefined>(scopeKey)
  const resolveScope = createIconScopeResolver()
  // Derived scope value allows nested configs and dynamic updates without re-creating contexts.
  const scope = $derived(resolveScope(options, parent?.()))
  setContext<ScopeContext>(scopeKey, () => scope)
</script>

{@render children?.()}
