import { createRoot } from 'react-dom/client';
import './vendor/styles/index.css';
import { App } from './App';
import { Gallery } from './components/Gallery';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to mount SPA: #root element not found in index.html');
}

// `?gallery=1` mounts the primitive verification harness instead of the app.
// It is a screenshot/test aid only and never appears in the routed product.
const showGallery = new URLSearchParams(window.location.search).has('gallery');

createRoot(container).render(showGallery ? <Gallery /> : <App />);
