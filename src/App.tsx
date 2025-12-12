import { AppLayout } from "./components/layout/AppLayout";
import { useTheme } from "./hooks/useTheme";
import { ToastProvider } from "./contexts/ToastContext";

function App() {
  useTheme();

  return (
    <ToastProvider>
      <AppLayout />
    </ToastProvider>
  );
}

export default App;
