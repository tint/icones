<script lang="ts">
  import { getContext, onDestroy, untrack } from "svelte"
  import {
    createIconController,
    defaultIconScope,
    iconOptionKeys,
    iconStyleText,
    renderIcon,
    type IconOptions,
  } from "@icones/core"
  import { scopeKey, type ScopeContext } from "./context"
  import type { IconProps } from "./types"

  // Extract scoped props; everything not explicitly scoped becomes raw SVG props.
  let { scope, fallback, style, ...props }: IconProps = $props()
  const parent = getContext<ScopeContext | undefined>(scopeKey)
  const root = defaultIconScope()
  // Scope resolution order: local prop > parent context > framework default.
  const selectedScope = $derived(scope ?? parent?.() ?? root)
  // Controller is pure input state + scope; keep it out of reactive objects to avoid extra work.
  const controller = createIconController(
    untrack(() => props as IconOptions),
    untrack(() => selectedScope)
  )
  let state = $state(controller.getState())
  const id = $props.id()

  // Keep controller state updated when input props or scope changes.
  $effect.pre(() => {
    controller.update(props as IconOptions, selectedScope)
    state = controller.getState()
  })
  // Subscribe after mount; updates trigger icon body arrival and load state changes.
  $effect(() => controller.subscribe(() => {
    state = controller.getState()
  }))
  onDestroy(() => controller.destroy())
  // Convert tuple state into render-ready attributes/body.
  const result = $derived(
    renderIcon(state, props as IconOptions, selectedScope.appearance, id)
  )
  // Forward any non-icon props directly to the root <svg>.
  const attributes = $derived(Object.fromEntries(
    Object.entries(props).filter(([key]) =>
      !(iconOptionKeys as readonly string[]).includes(key) && key !== "innerHTML"
    )
  ))
</script>

{#if result.available || fallback === undefined}
  <svg
    {...attributes}
    {...result.attributes}
    style={iconStyleText(result.style) + ";" + (style ?? "")}
  >
    {@html result.body}
  </svg>
{:else if typeof fallback === "function"}
  {@render fallback()}
{:else}
  {fallback}
{/if}
