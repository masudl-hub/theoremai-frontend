import { TheoremRunApp } from '@theoremai/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './run.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
	<StrictMode>
		<TheoremRunApp playgroundHref="/#playground" missingPayloadHref="/#playground" />
	</StrictMode>,
);
