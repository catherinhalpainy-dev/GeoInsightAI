import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import './index.css'
import App from './App.tsx'
import "./styles/tokens.css";
import { AppProvider } from './app/AppProvider.tsx';
import { ProjectProvider } from './project/ProjectProvider.tsx';
import { GlobalSearchProvider } from './search/GlobalSearchProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <ProjectProvider>
          <GlobalSearchProvider>
            <App />
          </GlobalSearchProvider>
        </ProjectProvider>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
