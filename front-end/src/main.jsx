// magazine-front/src/main.jsx
import './i18n/config';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './app_context/AuthContext.jsx';
import { UIProvider } from './app_context/UIContext.jsx';
import { MagazineProvider } from './app_context/MagazineContext.jsx';
import { AuthorProvider } from './app_context/AuthorContext.jsx';
import { MetadataProvider } from './app_context/MetadataContext.jsx';
import { ThemeProvider } from './app_context/ThemeContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <UIProvider>
        <ThemeProvider>
          <MetadataProvider>
            <MagazineProvider>
              <AuthorProvider>
                <App />
              </AuthorProvider>
            </MagazineProvider>
          </MetadataProvider>
        </ThemeProvider>
      </UIProvider>
    </AuthProvider>
  </React.StrictMode>
);
