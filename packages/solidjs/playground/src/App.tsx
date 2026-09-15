import { createSignal } from "solid-js"
import { Icon, IconConfig } from "@icones/solidjs"

export default function App() {
  const [alternate, setAlternate] = createSignal(false)
  const sources = {
    custom: {
      body: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor"/>',
      width: 24,
      height: 24,
    },
  }
  return (
    <main>
      <h1>@icones/solidjs</h1>
      <p>本地图标、配置继承与响应式切换</p>
      <IconConfig sources={sources} defaultSize="xl" strokeWidth={2}>
        <Icon
          name="tabler:star"
          altName="tabler:heart"
          showAlt={alternate()}
          aria-label="收藏"
        />
        <Icon name="custom" color="#7c3aed" size={40} />
        <button onClick={() => setAlternate(!alternate())}>切换图标</button>
      </IconConfig>
    </main>
  )
}
