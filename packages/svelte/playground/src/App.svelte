<script lang="ts">
  import { Icon, IconConfig } from "@icones/svelte"
  let alternate = $state(false)
  const sources = { custom: { body: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor"/>', width: 24, height: 24 } }
</script>

<main>
  <h1>@icones/svelte</h1>
  <p>本地图标、配置继承与响应式切换</p>
  <IconConfig {sources} defaultSize="xl" strokeWidth={2}>
    <Icon name="tabler:star" altName="tabler:heart" showAlt={alternate} aria-label="收藏" />
    <Icon name="custom" color="#7c3aed" size={40} />
    <button onclick={() => alternate = !alternate}>切换图标</button>
  </IconConfig>
</main>

<style>
  :global(body) { font-family: system-ui, sans-serif; margin: 3rem; color: #242424; }
  main { display: grid; gap: 1rem; justify-items: start; }
  button { padding: .65rem 1rem; cursor: pointer; }
</style>
