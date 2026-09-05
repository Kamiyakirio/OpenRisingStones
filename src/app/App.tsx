/** Composition root that binds the application ViewModel to the root View. */
import { useAppController } from "./hooks/useAppController";
import { AppView } from "./components/AppView";
import "./styles/App.css";

function App() {
  const viewModel = useAppController();
  return <AppView viewModel={viewModel} />;
}

export default App;
