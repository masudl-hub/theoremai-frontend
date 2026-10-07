export function Th30Light({ className }: { className?: string }) {
	return (
		<img
			src="/imagery/th30_cloud.png"
			className={className ? `th30-light ${className}` : 'th30-light'}
			alt=""
			aria-hidden
			draggable={false}
		/>
	);
}
