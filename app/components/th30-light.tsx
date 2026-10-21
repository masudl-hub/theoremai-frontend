import { stillRenditions } from '../lib/stills';

export function Th30Light({ className }: { className?: string }) {
	return (
		<img
			src={stillRenditions('/imagery/th30_cloud.png').full}
			className={className ? `th30-light ${className}` : 'th30-light'}
			alt=""
			aria-hidden
			draggable={false}
		/>
	);
}
