<script setup lang="ts">
import { ref } from "vue"
import { Icon, IconConfig } from "@icones/vue"
const alternate = ref(false)
const sources = {
  custom: {
    body: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor"/>',
    width: 24,
    height: 24,
  },
}
</script>

<template>
  <main>
    <h1>@icones/vue</h1>
    <p>本地图标、配置继承与响应式切换</p>
    <IconConfig :sources="sources" default-size="xl" :stroke-width="2">
      <Icon
        name="tabler:star"
        alt-name="tabler:heart"
        :show-alt="alternate"
        aria-label="收藏"
      />
      <Icon name="custom" color="#7c3aed" :size="40" />
      <button @click="alternate = !alternate">切换图标</button>
    </IconConfig>
  </main>
</template>
