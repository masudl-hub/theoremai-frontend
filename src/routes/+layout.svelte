<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>THEORUM</title>
	<meta
		name="description"
		content="A TypeScript kernel for typed agent profiles and deterministic turns."
	/>
	<meta name="theme-color" content="#f7f5f0" />
</svelte:head>

{@render children()}
