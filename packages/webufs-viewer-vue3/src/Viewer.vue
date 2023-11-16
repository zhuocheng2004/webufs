<template>
    <h1>Hello World!</h1>
    <button @click="count++">Count is: {{ count }}</button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

