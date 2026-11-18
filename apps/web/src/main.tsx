import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { aplicarVisual, lerVisual, ProvedorVisual } from "./visual.tsx";
import "./styles.css";

// Aplica o tema salvo antes do primeiro desenho, para a tela não piscar com o tema padrão.
aplicarVisual(lerVisual());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProvedorVisual>
      <App />
    </ProvedorVisual>
  </StrictMode>,
);
