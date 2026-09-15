<script lang="ts">
  import { Icon, IconConfig, type IconScope } from "@icones/svelte"
  let { scope, conflicts = false }: { scope?: IconScope; conflicts?: boolean } = $props()
  let alternate = $state(false)
  const circle = { body: '<circle cx="12" cy="12" r="10"/>', width: 24, height: 24 }
  const path = { body: '<path d="M0 12h24"/>', width: 24, height: 24 }
  const gradient = { body: '<defs><linearGradient id="a"/></defs><path fill="url(#a)"/>', width: 24, height: 24 }
  let clicks = $state(0)
  const runtimeName: string = "runtime:shape"
  const alternativeName: string = "local:shape"
</script>
<IconConfig sources={{ local: circle, alt: path }} defaultSize={alternate ? "xl" : "sm"}>
  <IconConfig strokeWidth={2}>
    <Icon name="local" altName="alt" showAlt={alternate} aria-label="shape" class="icon" />
  </IconConfig>
</IconConfig>
<button onclick={() => alternate = !alternate}>Toggle</button>
<Icon class="inline-pair" data={circle} altData={path} showAlt={alternate}
  name={conflicts ? "unused:main" : undefined}
  altName={conflicts ? "unused:alt" : undefined} />
<div class="set-sizes">
  <IconConfig sources={{ "tabler:star": circle, "lucide:star": path }} api={false} defaultSize={{ tabler: "lg", default: "md" }}>
    <IconConfig defaultSize={{ lucide: alternate ? 32 : 16 }}>
      <Icon name="tabler:star" />
      <Icon name="lucide:star" />
      <Icon name="tabler:star" altName="lucide:star" showAlt={alternate} />
      <Icon data={circle} />
    </IconConfig>
  </IconConfig>
</div>
<div class="set-options">
  <IconConfig
    defaultSize="lg"
    sizeValues={{ runtime: { lg: 48 }, default: { lg: 24 } }}
    strokeWidth={{ runtime: 2, default: 3 }}
    absoluteStrokeWidth={{ runtime: true, default: false }}
    api={{ runtime: { type: "symbol", baseUrl: "/icons" }, default: false }}
    sources={{ [alternativeName]: path }}
  >
    <Icon name={runtimeName} altName={alternativeName} showAlt={alternate} />
  </IconConfig>
</div>
{#if scope}
  <Icon name={alternate ? "fast" : "slow"} {scope} fallback="Loading" class="async-icon"/>
{/if}
<div class="gradients">
  <Icon data={gradient} onclick={() => clicks++} style="color:red"/>
  <Icon data={gradient}/>
  <output>{clicks}</output>
</div>
