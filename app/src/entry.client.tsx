import { StrictMode, startTransition } from "react"
import { hydrateRoot } from "react-dom/client"
import { HydratedRouter } from "react-router/dom"

const pathname =
  location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "") || "/"
if (pathname !== location.pathname)
  history.replaceState(
    history.state,
    "",
    pathname + location.search + location.hash
  )

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  )
})
