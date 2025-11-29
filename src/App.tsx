import { AppLayout } from "./components/layout/AppLayout";
import { useTheme } from "./hooks/useTheme";

function App() {
  useTheme();

  return (
    <AppLayout />
  );
}

export default App;
