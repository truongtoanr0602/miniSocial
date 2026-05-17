import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App'; 
import { BrowserRouter } from 'react-router-dom'; 
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'sonner';
import env from './config/env';

import './styles/tailwind.css'; 
import './styles/index.css'; 
import './styles/theme.css';
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={env.GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);