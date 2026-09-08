<script lang="ts">
import '../app.css';
import { page } from '$app/state';
import favicon from '$lib/assets/favicon.svg';
import Th30Widget from '$lib/components/Th30Widget.svelte';

let { children } = $props();

const showTh30 = $derived(!page.url.pathname.includes('/playground/run'));
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
{#if showTh30}
	<Th30Widget />
{/if}
