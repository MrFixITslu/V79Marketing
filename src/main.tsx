// Express/Vite middleware mode requires the React refresh preamble before App modules.
// Official plugin entrypoint is inert in production builds.
import '@vitejs/plugin-react/preamble';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {HelmetProvider} from 'react-helmet-async';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
);

