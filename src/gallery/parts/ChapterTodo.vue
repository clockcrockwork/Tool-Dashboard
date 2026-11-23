<script setup lang="ts">
/** まだ見本の無い章。部品シートの見出しと節の名前だけ並べ、「P1 で追加」と示す。部品ができたら章のファイルごと差し替える。 */
defineProps<{ id: string; title: string; lead?: string; items: readonly (readonly [id: string, title: string, code: string])[] }>();
</script>

<template>
  <section :id="id" class="ch">
    <h2>{{ title }}</h2>
    <p v-if="lead" class="lead2">{{ lead }}</p>
    <section v-for="it in items" :id="it[0]" :key="it[0]" class="ps-pt">
      <header><h3>{{ it[1] }}</h3><code v-if="it[2]">{{ it[2] }}</code><span class="tag nw">P1 で追加</span></header>
      <p class="use">部品ができたら、部品シート（design/claude-design/Parts.dc.html の #{{ it[0] }}）と同じ見本をここに置きます。</p>
    </section>
  </section>
</template>
