import {
  createContext,
  createMemo,
  createRenderEffect,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  Show,
  splitProps,
  useContext,
  type Accessor,
  type JSX,
} from "solid-js"
import {
  createIconController,
  createIconScopeResolver,
  defaultIconScope,
  iconOptionKeys,
  iconStyleText,
  renderIcon,
  type IconOptions,
  type IconScope,
  type IconScopeOptions,
} from "@icones/core"

export type IconProps = IconOptions &
  Omit<
    JSX.SvgSVGAttributes<SVGSVGElement>,
    keyof IconOptions | "children" | "innerHTML"
  > & { scope?: IconScope; fallback?: JSX.Element }
// Runtime scope is passed via context as an accessor; keep lookups cheap and reactive-safe.
const ScopeContext = createContext<Accessor<IconScope>>()

export function Icon(props: IconProps): JSX.Element {
  const inherited = useContext(ScopeContext)
  // Resolve inherited scope first, then per-prop override.
  const root = defaultIconScope()
  const scope = () => props.scope ?? inherited?.() ?? root
  // Separate option props from passthrough SVG attrs for stable render input.
  const [options, other] = splitProps(props, [
    ...iconOptionKeys,
    "scope",
    "fallback",
    "style",
  ])
  const controller = createIconController(options as IconOptions, scope())
  const [state, setState] = createSignal(controller.getState())
  const id = createUniqueId()
  createRenderEffect(() => {
    // Keep controller synced with latest options/scope on every reactive tick.
    controller.update({ ...options } as IconOptions, scope())
    setState(controller.getState())
  })
  onMount(() => {
    // Subscribe to async icon loading and unmount safely on component disposal.
    const unsubscribe = controller.subscribe(() =>
      setState(controller.getState())
    )
    onCleanup(unsubscribe)
  })
  onCleanup(() => controller.destroy())
  const result = createMemo(() =>
    renderIcon(state(), options as IconOptions, scope().appearance, id)
  )
  const style = () =>
    typeof props.style === "string"
      ? iconStyleText(result().style) + ";" + props.style
      : { ...result().style, ...props.style }
  return (
    <Show
      when={result().available || props.fallback === undefined}
      fallback={props.fallback}
    >
      {/* Merge icon-generated style with user-provided style props. */}
      <svg
        {...other}
        {...result().attributes}
        style={style()}
        innerHTML={result().body}
      />
    </Show>
  )
}

export function IconConfig(
  props: IconScopeOptions & { children?: JSX.Element }
): JSX.Element {
  // Build and expose merged scope for descendants.
  const parent = useContext(ScopeContext)
  const [, options] = splitProps(props, ["children"])
  const resolveScope = createIconScopeResolver()
  const scope = createMemo(() => resolveScope({ ...options }, parent?.()))
  return (
    <ScopeContext.Provider value={scope}>
      {props.children}
    </ScopeContext.Provider>
  )
}

export function useIconScope(): Accessor<IconScope> {
  // Public helper for custom consumers needing full resolved scope data.
  const scope = useContext(ScopeContext)
  const root = defaultIconScope()
  return scope ?? (() => root)
}
