// oxlint-disable-next-line import/no-unassigned-import -- Registers the Web Component.
import "@icones/vanilla/web-element"
// oxlint-disable-next-line import/no-unassigned-import -- Observes standard icon elements.
import "@icones/vanilla/standard-element"
const target = document.querySelector<HTMLElement>("#icons")!
const standard = document.querySelector<HTMLElement>("#standard-icons")!
const toggle = document.querySelector("#toggle")!
const onToggle = () => {
  target.setAttribute(
    "show-alt",
    String(target.getAttribute("show-alt") !== "true")
  )
  standard.setAttribute(
    "icon-show-alt",
    String(standard.getAttribute("icon-show-alt") !== "true")
  )
}
toggle.addEventListener("click", onToggle)

if (import.meta.hot)
  import.meta.hot.dispose(() => toggle.removeEventListener("click", onToggle))
