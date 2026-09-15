import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Icon } from "@icones/react"
import { Link } from "../../../shared/routing/router.tsx"
import { useLanguage } from "../../../shared/i18n/language.ts"
import { cn } from "../../../shared/lib/cn.ts"
import { paths } from "../../../shared/routing/paths.ts"
import { DashboardShowcase } from "./dashboard-showcase.tsx"

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
const surface =
  "border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/20"

export function UIShowcase() {
  const { t } = useLanguage()
  return (
    <section
      id="ui-examples"
      aria-labelledby="ui-examples-title"
      className="mx-auto max-w-7xl scroll-mt-8 px-6 py-16 sm:py-20"
    >
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">
            {t("Small details. Real interactions.")}
          </p>
          <h2
            id="ui-examples-title"
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {t("See icons in their element.")}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
            {t(
              "Switch a tab, save an idea or compare icon families. Try real icons in these everyday interface patterns."
            )}
          </p>
        </div>
        <Link
          to={`${paths.icons}?set=tabler`}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 self-start rounded text-sm font-medium text-primary sm:self-auto",
            focusRing
          )}
        >
          {t("Explore these icons")}
          <Icon name="tabler:arrow-up-right" size={18} aria-hidden="true" />
        </Link>
      </div>
      <DashboardShowcase />
      <div className="mt-8 grid gap-x-6 gap-y-10 lg:grid-cols-2">
        <DemoCard
          number="01"
          title="A clear sense of place"
          description="Outline at rest, filled when selected. A familiar navigation bar makes the active view easy to find."
          tint="bg-slate-100 dark:bg-slate-900"
        >
          <NavigationDemo />
        </DemoCard>
        <DemoCard
          number="02"
          title="A little feedback goes a long way"
          description="Like it. Save it. Let a change in shape and color confirm that an action worked."
          tint="bg-amber-50/70 dark:bg-stone-900/60"
        >
          <FavoriteDemo />
        </DemoCard>
        <DemoCard
          number="03"
          title="Actions, right where you need them"
          description="Pair icons with clear labels. Open the menu and try pinning, reading or hiding this sample note."
          tint="bg-violet-50/70 dark:bg-violet-950/20"
        >
          <ActionMenuDemo />
        </DemoCard>
        <DemoCard
          number="04"
          title="Preferences with personality"
          description="Switch notifications on or off. The icon, control and label work together to communicate each state."
          tint="bg-slate-100 dark:bg-slate-900"
        >
          <PreferencesDemo />
        </DemoCard>
      </div>
      <p className="mt-8 flex items-start gap-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
        <Icon
          name="tabler:sparkles"
          size={16}
          aria-hidden="true"
          className="mt-1 shrink-0"
        />
        {t(
          "Live previews, not screenshots. Changes stay in these examples; no account, messages or settings are affected."
        )}
      </p>
    </section>
  )
}

function DemoCard({
  number,
  title,
  description,
  tint,
  children,
}: {
  number: string
  title: string
  description: string
  tint: string
  children: ReactNode
}) {
  const { t } = useLanguage()
  const titleId = useId()
  return (
    <article aria-labelledby={titleId} className="min-w-0">
      <div
        className={cn(
          "relative flex min-h-100 items-center justify-center rounded-3xl border border-slate-200/60 px-4 py-8 sm:px-8 dark:border-slate-800",
          tint
        )}
      >
        {children}
      </div>
      <div className="mt-5 flex gap-4 px-1">
        <span
          aria-hidden="true"
          className="pt-1 font-mono text-xs text-slate-400 dark:text-slate-500"
        >
          {number}
        </span>
        <div>
          <h3 id={titleId} className="text-lg font-semibold tracking-tight">
            {t(title)}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
            {t(description)}
          </p>
        </div>
      </div>
    </article>
  )
}

function NavigationDemo() {
  const { t } = useLanguage()
  const [active, setActive] = useState(0)
  const id = useId()
  const tabsRef = useRef<HTMLDivElement>(null)
  // Literal names let the Vite plugin include both states without runtime requests.
  const tabs = [
    {
      label: "Feed",
      title: "Everything, at a glance.",
      description: "Your next idea starts here.",
      icon: (
        <Icon
          name="tabler:home"
          altName="tabler:home-filled"
          showAlt={active === 0}
          size={22}
          aria-hidden="true"
        />
      ),
    },
    {
      label: "Inbox",
      title: "Keep the conversation going.",
      description: "A place for your team's best ideas.",
      icon: (
        <Icon
          name="tabler:message-circle"
          altName="tabler:message-circle-filled"
          showAlt={active === 1}
          size={22}
          aria-hidden="true"
        />
      ),
    },
    {
      label: "Saved",
      title: "Good ideas, kept close.",
      description: "A little inspiration for later.",
      icon: (
        <Icon
          name="tabler:bookmark"
          altName="tabler:bookmark-filled"
          showAlt={active === 2}
          size={22}
          aria-hidden="true"
        />
      ),
    },
    {
      label: "Profile",
      title: "A space that's yours.",
      description: "The small details make it personal.",
      icon: (
        <Icon
          name="tabler:user"
          altName="tabler:user-filled"
          showAlt={active === 3}
          size={22}
          aria-hidden="true"
        />
      ),
    },
  ]
  const current = tabs[active]!
  return (
    <div className={cn("w-full max-w-sm overflow-hidden rounded-2xl", surface)}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <span className="text-xs font-semibold tracking-wide">
          {t("Your workspace")}
        </span>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {t("Live preview")}
        </span>
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${active}`}
        tabIndex={0}
        className={cn(
          "flex min-h-47 flex-col items-center justify-center px-4 py-6 text-center",
          focusRing
        )}
      >
        <div className="mb-4 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
          {current.icon}
        </div>
        <p className="text-sm font-semibold">{t(current.title)}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {t(current.description)}
        </p>
      </div>
      <div
        ref={tabsRef}
        role="tablist"
        aria-label={t("Demo navigation")}
        className="grid grid-cols-4 gap-1 border-t border-slate-100 p-2 dark:border-slate-800"
        onKeyDown={(event) => {
          const next =
            event.key === "ArrowRight"
              ? (active + 1) % tabs.length
              : event.key === "ArrowLeft"
                ? (active + tabs.length - 1) % tabs.length
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : undefined
          if (next === undefined) return
          event.preventDefault()
          setActive(next)
          tabsRef.current
            ?.querySelectorAll<HTMLButtonElement>("button")
            [next]?.focus()
        }}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel`}
            aria-selected={active === index}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            className={cn(
              "flex min-h-15 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-xs! font-medium! motion-safe:transition-colors",
              active === index
                ? "bg-primary/10 text-primary!"
                : "text-slate-500! hover:bg-slate-100 dark:text-slate-400! dark:hover:bg-slate-800",
              focusRing
            )}
          >
            {tab.icon}
            {t(tab.label)}
          </button>
        ))}
      </div>
    </div>
  )
}

function FavoriteDemo() {
  const { t } = useLanguage()
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  return (
    <div className={cn("w-full max-w-sm rounded-2xl p-5", surface)}>
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          <Icon name="tabler:sparkles" size={18} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold">{t("Design notes")}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t("An idea worth keeping")}
          </p>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="my-5 flex h-25 items-center justify-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/20"
      >
        <div className="grid size-14 -rotate-12 place-items-center rounded-2xl border border-amber-200 bg-white text-amber-500 shadow-sm dark:border-amber-800 dark:bg-slate-900">
          <Icon name="tabler:star" size={30} />
        </div>
        <div className="z-1 grid size-17 rotate-6 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 dark:text-slate-950">
          <Icon
            name="tabler:heart"
            altName="tabler:heart-filled"
            showAlt={liked}
            size={34}
          />
        </div>
        <div className="grid size-14 rotate-12 place-items-center rounded-2xl border border-amber-200 bg-white text-amber-500 shadow-sm dark:border-amber-800 dark:bg-slate-900">
          <Icon
            name="tabler:bookmark"
            altName="tabler:bookmark-filled"
            showAlt={saved}
            size={30}
          />
        </div>
      </div>
      <p className="text-sm font-medium">
        {t("Make something worth a second look.")}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          type="button"
          aria-label={t("Like this example")}
          aria-pressed={liked}
          onClick={() => setLiked(!liked)}
          className={cn(
            "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm! font-medium! motion-safe:transition-colors",
            liked
              ? "bg-rose-50 text-rose-600! dark:bg-rose-950/40 dark:text-rose-300!"
              : "bg-slate-100 text-slate-600! dark:bg-slate-800 dark:text-slate-300!",
            focusRing
          )}
        >
          <Icon
            name="tabler:heart"
            altName="tabler:heart-filled"
            showAlt={liked}
            size={20}
            aria-hidden="true"
          />
          <span>{24 + Number(liked)}</span>
        </button>
        <button
          type="button"
          aria-label={t("Save this example")}
          aria-pressed={saved}
          onClick={() => setSaved(!saved)}
          className={cn(
            "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm! font-medium! motion-safe:transition-colors",
            saved
              ? "bg-primary/10 text-primary!"
              : "text-slate-600! hover:bg-slate-100 dark:text-slate-300! dark:hover:bg-slate-800",
            focusRing
          )}
        >
          <Icon
            name="tabler:bookmark"
            altName="tabler:bookmark-filled"
            showAlt={saved}
            size={20}
            aria-hidden="true"
          />
          {t(saved ? "Saved" : "Save")}
        </button>
      </div>
    </div>
  )
}

function ActionMenuDemo() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(true)
  const [pinned, setPinned] = useState(false)
  const [read, setRead] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [status, setStatus] = useState("Try an action from the menu.")
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node))
        setOpen(false)
    }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [open])
  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }
  const actionClass = cn(
    "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-sm! text-slate-600! hover:bg-slate-100 dark:text-slate-300! dark:hover:bg-slate-800",
    focusRing
  )
  return (
    <div
      ref={rootRef}
      className="relative w-full max-w-sm"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault()
          event.stopPropagation()
          close()
        }
      }}
    >
      <div className={cn("rounded-2xl p-5", surface)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Icon
              name="tabler:pin"
              altName="tabler:pin-filled"
              showAlt={pinned}
              size={18}
              aria-hidden="true"
              className={pinned ? "text-primary" : "text-slate-400"}
            />
            {t("Project notes")}
          </div>
          <button
            ref={triggerRef}
            type="button"
            aria-label={t("Note actions")}
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
            className={cn(
              "grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg",
              open
                ? "bg-primary/10 text-primary"
                : "hover:bg-slate-100 dark:hover:bg-slate-800",
              focusRing
            )}
          >
            <Icon name="tabler:dots" size={22} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-4 min-h-10 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {t(
            hidden
              ? "This note is hidden in the preview."
              : "Good interfaces make the next step feel obvious."
          )}
        </p>
        <div className="mt-4 flex gap-2 text-xs">
          <span
            className={cn(
              "rounded-full px-2.5 py-1",
              read
                ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                : "bg-primary/10 text-primary"
            )}
          >
            {t(read ? "Read" : "Unread")}
          </span>
          {pinned && (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
              {t("Pinned")}
            </span>
          )}
        </div>
      </div>
      <div className="min-h-25 pt-4">
        <p
          role="status"
          className="px-2 text-center text-xs leading-6 text-slate-500 dark:text-slate-400"
        >
          {t(status)}
        </p>
      </div>
      <div
        id={id}
        hidden={!open}
        role="group"
        aria-label={t("Actions for this note")}
        className={cn(
          "absolute top-16 right-3 left-3 z-10 rounded-xl p-2 sm:left-14",
          surface
        )}
      >
        <button
          type="button"
          onClick={() => {
            setPinned(!pinned)
            setStatus(pinned ? "Note unpinned." : "Note pinned to the top.")
            close()
          }}
          className={actionClass}
        >
          <Icon
            name="tabler:pin"
            altName="tabler:pin-filled"
            showAlt={pinned}
            size={19}
            aria-hidden="true"
          />
          {t(pinned ? "Unpin note" : "Pin note")}
        </button>
        <button
          type="button"
          onClick={() => {
            setRead(!read)
            setStatus(read ? "Note marked as unread." : "Note marked as read.")
            close()
          }}
          className={actionClass}
        >
          <Icon
            name="tabler:mail"
            altName="tabler:mail-opened"
            showAlt={read}
            size={19}
            aria-hidden="true"
          />
          {t(read ? "Mark as unread" : "Mark as read")}
        </button>
        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
        <button
          type="button"
          onClick={() => {
            setHidden(!hidden)
            setStatus(
              hidden ? "Note visible again." : "Note hidden in this preview."
            )
            close()
          }}
          className={actionClass}
        >
          <Icon
            name="tabler:eye-off"
            altName="tabler:eye"
            showAlt={hidden}
            size={19}
            aria-hidden="true"
          />
          {t(hidden ? "Show note" : "Hide note")}
        </button>
      </div>
    </div>
  )
}

function PreferencesDemo() {
  const { t } = useLanguage()
  const [push, setPush] = useState(true)
  const [email, setEmail] = useState(false)
  const [sound, setSound] = useState(true)
  const channels = [
    {
      label: "Push notifications",
      description: "A heads-up, right on time.",
      enabled: push,
      toggle: () => setPush(!push),
      icon: (
        <Icon
          name="tabler:bell"
          altName="tabler:bell-filled"
          showAlt={push}
          size={21}
          aria-hidden="true"
        />
      ),
    },
    {
      label: "Email digest",
      description: "The highlights, in one place.",
      enabled: email,
      toggle: () => setEmail(!email),
      icon: (
        <Icon
          name="tabler:mail"
          altName="tabler:mail-filled"
          showAlt={email}
          size={21}
          aria-hidden="true"
        />
      ),
    },
    {
      label: "Notification sounds",
      description: "A little sound, or some quiet.",
      enabled: sound,
      toggle: () => setSound(!sound),
      icon: (
        <Icon
          name="tabler:volume-off"
          altName="tabler:volume"
          showAlt={sound}
          size={21}
          aria-hidden="true"
        />
      ),
    },
  ]
  return (
    <div
      className={cn("w-full max-w-sm rounded-2xl px-4 py-5 sm:px-5", surface)}
    >
      <p className="text-sm font-semibold">{t("Make yourself at home.")}</p>
      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {channels.map((channel) => (
          <div key={channel.label} className="flex items-center gap-3 py-3.5">
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg sm:size-10",
                channel.enabled
                  ? "bg-primary/10 text-primary!"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-800"
              )}
            >
              {channel.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium sm:text-sm">
                {t(channel.label)}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                {t(channel.description)}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label={t(channel.label)}
              aria-checked={channel.enabled}
              onClick={channel.toggle}
              className={cn(
                "flex min-h-11 shrink-0 cursor-pointer items-center rounded-full",
                focusRing
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center rounded-full p-1 motion-safe:transition-colors",
                  channel.enabled
                    ? "bg-primary"
                    : "bg-slate-300 dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full bg-white text-slate-500 shadow-sm motion-safe:transition-transform",
                    channel.enabled && "translate-x-5 text-primary"
                  )}
                >
                  <Icon
                    name="tabler:x"
                    altName="tabler:check"
                    showAlt={channel.enabled}
                    size={12}
                    strokeWidth={2}
                    absoluteStrokeWidth
                    aria-hidden="true"
                  />
                </span>
              </span>
            </button>
          </div>
        ))}
      </div>
      <p
        role="status"
        className="mt-1 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"
      >
        {t("{count} notification options enabled", {
          count: channels.filter((channel) => channel.enabled).length,
        })}
      </p>
    </div>
  )
}
