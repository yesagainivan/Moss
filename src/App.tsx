import { AppLayout } from "./components/layout/AppLayout";
import { useTheme } from "./hooks/useTheme";
import { useFontScale } from "./hooks/useFontScale";
import { ToastProvider } from "./contexts/ToastContext";

function App() {
  useTheme();
  useFontScale(); // Initialize font scaling system

  return (
    <ToastProvider>
      <AppLayout />
    </ToastProvider>
  );
}

export default App;
