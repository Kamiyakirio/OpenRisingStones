/** Composition root that binds the application ViewModel to the root View. */
import { useAppViewModel } from "./viewmodels/useAppViewModel";
import { AppView } from "./views/AppView";
import "./App.css";

function App() {
  const viewModel = useAppViewModel();
  return <AppView viewModel={viewModel} />;
}

export default App;
