<script setup lang="ts">
// ヘッダーの入力欄（01 の 6.5）
// - 1行1見出し。左に行番号
// - 高さは最大 10 行。外の箱だけが縦にも横にもスクロールする
// - テキストエリアは中身に合わせて伸ばし、中ではスクロールさせない（field-sizing は Chromium 108 にない）
// - 行番号の列は sticky で左に貼り付ける
import { computed, nextTick, onMounted, ref, watch } from 'vue';

const LINE_H = 20;
const PAD_Y = 6;
const PAD_X = 8;

const props = defineProps<{ modelValue: string; minLines: number; id?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const ta = ref<HTMLTextAreaElement | null>(null);
const width = ref(0);

const lines = computed(() => props.modelValue.split(/\r\n|\r|\n/));
// 行番号は、入力した行数と使う行数の多いほうまで出す
const count = computed(() => Math.max(lines.value.length, props.minLines, 1));
const height = computed(() => count.value * LINE_H + PAD_Y * 2);

let ctx: CanvasRenderingContext2D | null = null;
function measureWidth(): void {
  const el = ta.value;
  if (!el) return;
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return;
  ctx.font = getComputedStyle(el).font;
  let w = 0;
  for (const l of lines.value) w = Math.max(w, ctx.measureText(l).width);
  // 一番長い行の幅＋左右の余白＋カーソルの分
  width.value = Math.ceil(w + PAD_X * 2 + 2);
}

watch(lines, () => nextTick(measureWidth));
onMounted(measureWidth);
</script>

<template>
  <div class="box">
    <div class="inner">
      <div class="gutter" aria-hidden="true" :style="{ minHeight: `${height}px` }">
        <div v-for="n in count" :key="n">{{ n }}</div>
      </div>
      <textarea
        :id="id"
        ref="ta"
        :value="modelValue"
        wrap="off"
        spellcheck="false"
        :style="{ height: `${height}px`, width: `${width}px` }"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>
  </div>
</template>

<style scoped>
.box {
  max-height: calc(10 * 20px + 12px);
  overflow: auto;
  background: var(--bg-input);
  border-radius: 5px;
}
.inner {
  display: flex;
  align-items: flex-start;
  width: max-content;
  min-width: 100%;
}
.gutter {
  position: sticky;
  left: 0;
  z-index: 1;
  flex: none;
  width: 30px;
  padding: 6px 6px 6px 0;
  background: #2d2e34;
  color: #71737c;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 20px;
  text-align: right;
}
textarea {
  /* 外の箱の幅より狭くはしない */
  flex: 1 0 auto;
  display: block;
  padding: 6px 8px;
  border: none;
  outline: none;
  resize: none;
  overflow: hidden;
  background: transparent;
  color: var(--text);
  font-family: var(--font);
  font-size: 12px;
  line-height: 20px;
  white-space: pre;
}
</style>
