import { createRoot } from 'react-dom/client';
import './vendor/styles/index.css';
import { App } from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to mount SPA: #root element not found in index.html');
}

createRoot(container).render(<App />);
