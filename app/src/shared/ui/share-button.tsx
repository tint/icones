import React from "react"
import { Icon } from "@icones/react"
import { useLanguage } from "../i18n/language.ts"
import { Button } from "./button.tsx"

export function ShareButton({ showIcon = false }: { showIcon?: boolean }) {
  const { t } = useLanguage()
  const [failed, setFailed] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const timeoutRef = React.useRef<number>(undefined)

  React.useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Icones",
          url: window.location.href,
        })
        return
      }

      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setFailed(true)
      }
    }
  }

  return (
    <Button
      onClick={() => void share()}
      title={
        failed
          ? t("Sharing is unavailable. Copy the page URL from your browser.")
          : undefined
      }
    >
      {showIcon && (
        <Icon
          icon="tabler:share"
          altName="tabler:check"
          showAlt={copied}
          size={17}
        />
      )}
      <span>
        {failed
          ? t("Copy URL from address bar")
          : copied
            ? t("Link copied")
            : t("Share")}
      </span>
    </Button>
  )
}
