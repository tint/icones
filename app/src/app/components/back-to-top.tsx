import { useEffect, useState } from "react"
import { Icon } from "@icones/react"
import { useLanguage } from "../../shared/i18n/language.ts"

export function BackToTop() {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 400)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      aria-label={t("Back to top")}
      title={t("Back to top")}
      className="fixed right-[calc(1.25rem+env(safe-area-inset-right))] bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-20 flex size-12 cursor-pointer items-center justify-center rounded-full bg-primary shadow-lg shadow-slate-950/20 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      onClick={() => {
        // Keep keyboard focus at the top when the button disappears.
        document
          .querySelector<HTMLElement>("#top a")
          ?.focus({ preventScroll: true })
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        })
      }}
    >
      <Icon
        name="tabler:arrow-up"
        size={24}
        aria-hidden="true"
        className="text-white dark:text-slate-950"
      />
    </button>
  )
}
