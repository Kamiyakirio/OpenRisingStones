/** Composition root that binds the application ViewModel to the root View. */
import { useAppViewModel } from "./hooks/useAppController";
import { AppView } from "./components/AppView";
import "./styles/App.css";

function App() {
  const viewModel = useAppViewModel();
  return <AppView viewModel={viewModel} />;
}

export default App;
