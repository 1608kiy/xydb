<template>
  <div class="legacy-page-frame">
    <iframe
      :src="src"
      :title="title"
      class="legacy-iframe"
      loading="eager"
      referrerpolicy="no-referrer"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: string
  title?: string
}>()

const src = computed(() => `/SFOTWARE/frontend/${props.page}`)
const title = computed(() => props.title || props.page)
</script>

<style scoped>
.legacy-page-frame {
  width: 100%;
  min-height: calc(100vh - 16px);
}

.legacy-iframe {
  width: 100%;
  min-height: calc(100vh - 16px);
  border: 0;
  display: block;
  background: #fff;
  border-radius: 0;
}
</style>
