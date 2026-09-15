import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  useId,
  watchEffect,
  type InjectionKey,
  type ShallowRef,
  type SVGAttributes,
} from "vue"
import {
  createIconController,
  createIconScopeResolver,
  defaultIconScope,
  iconOptionKeys,
  renderIcon,
  type IconOptions,
  type IconScope,
  type IconScopeOptions,
} from "@icones/core"

export type IconProps = IconOptions &
  Omit<SVGAttributes, keyof IconOptions | "innerHTML"> & {
    scope?: IconScope
    fallback?: string
  }
// Shared scope token; each nested config provides a resolved scope through this injection key.
const scopeKey: InjectionKey<Readonly<ShallowRef<IconScope>>> =
  Symbol("icones.scope")
// Vue treats false/default booleans explicitly; undefined keeps "not set" behavior for icon options.
const booleanProp = { type: Boolean, default: undefined }
// Build icon options from core keys while keeping hyphenated aria props as raw SVG attributes.
const iconProps = {
  // Vue camelizes declared prop names; keep hyphenated ARIA fields as SVG attrs.
  ...(Object.fromEntries(
    iconOptionKeys
      .filter((key) => !key.startsWith("aria-"))
      .map((key) => [key, null])
  ) as Record<
    Exclude<(typeof iconOptionKeys)[number], "aria-label" | "aria-hidden">,
    null
  >),
  hFlip: booleanProp,
  vFlip: booleanProp,
  showAlt: booleanProp,
  absoluteStrokeWidth: booleanProp,
  scope: null,
  fallback: String,
}

export const Icon = defineComponent(
  (props: IconProps, { attrs, slots }) => {
    // Resolve inherited scope, then let each render pass refresh local controller state.
    const parent = inject(scopeKey, shallowRef(defaultIconScope()))
    const controller = createIconController(props, props.scope ?? parent.value)
    // Keep a stable state signal so template updates run when async loading resolves.
    const state = shallowRef(controller.getState())
    const id = useId()
    let unsubscribe: (() => void) | undefined

    // Keep core attributes/options and scope in sync with reactive props.
    watchEffect(() => {
      controller.update({ ...props }, props.scope ?? parent.value)
      state.value = controller.getState()
    })
    onMounted(() => {
      // Subscribe only when mounted so unsubscribes happen cleanly on teardown.
      unsubscribe = controller.subscribe(() => {
        state.value = controller.getState()
      })
      state.value = controller.getState()
    })
    onBeforeUnmount(() => {
      unsubscribe?.()
      controller.destroy()
    })
    return () => {
      // Render is delayed until renderIcon decides availability; fallback is optional and stable.
      const result = renderIcon(
        state.value,
        { ...props, ...attrs } as IconProps,
        (props.scope ?? parent.value).appearance,
        id
      )
      if (!result.available && (slots.fallback || props.fallback !== undefined))
        return slots.fallback?.() ?? props.fallback
      return h("svg", {
        ...attrs,
        ...result.attributes,
        style: [result.style, attrs.style],
        innerHTML: result.body,
      })
    }
  },
  { name: "Icon", inheritAttrs: false, props: iconProps }
)

export const IconConfig = defineComponent(
  (props: IconScopeOptions, { slots }) => {
    // Merge provided options with parent scope and expose resolved scope to descendants.
    const parent = inject(scopeKey, shallowRef(defaultIconScope()))
    const resolveScope = createIconScopeResolver()
    const scope = computed(() => resolveScope({ ...props }, parent.value))
    provide(scopeKey, scope)
    return () => slots.default?.()
  },
  {
    name: "IconConfig",
    props: {
      sizeValues: null,
      defaultSize: null,
      strokeWidth: null,
      absoluteStrokeWidth: { type: [Boolean, Object], default: undefined },
      sources: null,
      api: null,
      store: null,
    },
  }
)

export function useIconScope() {
  // Convenience API for consumers that need full resolved scope.
  return inject(scopeKey, shallowRef(defaultIconScope()))
}
