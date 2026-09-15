import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react"
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  Navigate as RouterNavigate,
  useLocation as useRouterLocation,
  useNavigate as useRouterNavigate,
  type LinkProps,
  type NavLinkProps,
  type NavigateProps,
  type NavigateFunction,
  type NavigateOptions,
  type To,
} from "react-router"

// Framework routes include the locale segment; components work with locale-neutral paths.
// An empty prefix also supports isolated tests with a locale-aware router basename.
const RouteLocaleContext = createContext("")
export const LocalizedRoutingProvider = RouteLocaleContext.Provider
const subscribe = () => () => {}

function localize(to: To, prefix: string): To {
  if (typeof to === "string")
    return to.startsWith("/") && !to.startsWith("//") ? prefix + to : to
  return to.pathname?.startsWith("/")
    ? { ...to, pathname: prefix + to.pathname }
    : to
}
export function Link(props: LinkProps) {
  const prefix = useContext(RouteLocaleContext)
  return <RouterLink {...props} to={localize(props.to, prefix)} />
}
export function NavLink(props: NavLinkProps) {
  const prefix = useContext(RouteLocaleContext)
  return <RouterNavLink {...props} to={localize(props.to, prefix)} />
}
export function Navigate(props: NavigateProps) {
  const prefix = useContext(RouteLocaleContext)
  return <RouterNavigate {...props} to={localize(props.to, prefix)} />
}
export function useLocation() {
  const location = useRouterLocation()
  const prefix = useContext(RouteLocaleContext)
  // Static HTML has no query-specific UI. Apply URL filters after hydration,
  // while client-side navigation (and isolated CSR tests) reads them immediately.
  const search = useSyncExternalStore(
    subscribe,
    () => location.search,
    () => ""
  )
  return {
    ...location,
    search,
    pathname:
      prefix &&
      (location.pathname === prefix ||
        location.pathname.startsWith(prefix + "/"))
        ? location.pathname.slice(prefix.length) || "/"
        : location.pathname,
  }
}
export function useNavigate(): NavigateFunction {
  const navigate = useRouterNavigate()
  const prefix = useContext(RouteLocaleContext)
  return useCallback<NavigateFunction>(
    (to: To | number, options?: NavigateOptions) =>
      typeof to === "number"
        ? navigate(to)
        : navigate(localize(to, prefix), options),
    [navigate, prefix]
  )
}
export { useSearchParams } from "react-router"
