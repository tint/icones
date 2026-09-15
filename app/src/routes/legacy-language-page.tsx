import { useEffect } from "react"
import { useLocation } from "react-router"

export default function LegacyLanguagePage() {
  const { pathname, search, hash } = useLocation()
  const href = (pathname.replace(/^\/en-US(?=\/|$)/, "") || "/") + search + hash
  useEffect(() => {
    window.location.replace(href)
  }, [href])
  return <a href={href}>Continue to Icones</a>
}
