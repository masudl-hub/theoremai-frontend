<script lang="ts">
let {
	checked = false,
	disabled = false,
	onchange,
	id: inputId = undefined,
}: {
	checked?: boolean;
	disabled?: boolean;
	onchange?: (_checked: boolean) => void;
	id?: string;
} = $props();
</script>

<button
	class="bracket-check nodrag nowheel"
	aria-checked={checked}
	{disabled}
	id={inputId}
	onclick={() => {
		if (!disabled) onchange?.(!checked);
	}}
	role="checkbox"
	type="button"
>
	<span aria-hidden="true">{checked ? '[x]' : '[ ]'}</span>
</button>

<style>
.bracket-check {
	flex-shrink: 0;
	appearance: none;
	border: 0;
	background: transparent;
	padding: 0;
	margin: 0;
	font: inherit;
	font-size: inherit;
	font-weight: inherit;
	line-height: 1;
	color: inherit;
	cursor: pointer;
}

.bracket-check:focus-visible {
	outline: 2px solid #000;
	outline-offset: 2px;
}

.bracket-check:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}
</style>
