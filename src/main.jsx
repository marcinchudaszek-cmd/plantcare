import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* HashRouter — nie wymaga konfiguracji serwera, działa na GitHub Pages bez problemów */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
