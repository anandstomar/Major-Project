import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { WalletContextProvider } from './components/EscrowCard/WalletContextProvider';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <WalletContextProvider>
      <App />
    </WalletContextProvider>
  </React.StrictMode>
);