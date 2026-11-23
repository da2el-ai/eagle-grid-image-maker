<script setup lang="ts">
// 線で描くアイコン（モックアップと同じ形）
import { computed } from 'vue';

export type IconName =
  | 'grid' | 'image' | 'text' | 'look' | 'export'
  | 'reload' | 'trash' | 'fit' | 'minus' | 'plus'
  | 'prev' | 'next' | 'warn' | 'chevron';

const props = withDefaults(defineProps<{ name: IconName; size?: number; strokeWidth?: number }>(), { size: 18, strokeWidth: 1.4 });

const PATHS: Record<IconName, string> = {
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
  text: '<path d="M5 7V5h14v2M12 5v14M9.5 19h5"/>',
  look: '<path d="M12 4a8 8 0 1 0 0 16c1.1 0 1.6-.8 1.3-1.7-.4-1.1.3-2.3 1.5-2.3H17a3 3 0 0 0 3-3c0-5-3.6-9-8-9z"/><circle cx="8" cy="11.5" r="1"/><circle cx="11" cy="7.8" r="1"/><circle cx="15.5" cy="8.8" r="1"/>',
  export: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/>',
  reload: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  prev: '<path d="M14.5 6l-6 6 6 6"/>',
  next: '<path d="M9.5 6l6 6-6 6"/>',
  warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  chevron: '<path d="M7 10l5 5 5-5"/>',
};

const inner = computed(() => PATHS[props.name]);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="inner"
  />
</template>
