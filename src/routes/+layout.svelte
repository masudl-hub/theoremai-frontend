<script lang="ts">
import '../app.css';
import favicon from '$lib/assets/favicon.svg';
import Th30Widget from '$lib/components/Th30Widget.svelte';

let { children } = $props();
</script>

<svelte:head>
	<link href={favicon} rel="icon">
	<title>THEORUM</title>
	<meta
		name="description"
		content="A TypeScript kernel for typed agent profiles and deterministic turns."
	>
	<meta name="theme-color" content="#f7f5f0">
</svelte:head>

{@render children()}
<Th30Widget />
