import {StrictMode} from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CurrencyProvider } from "./context/CurrencyContext";
import { SavingsGoalProvider } from "./context/SavingsGoalContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <CurrencyProvider>
          <SavingsGoalProvider>
            <App />
          </SavingsGoalProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
