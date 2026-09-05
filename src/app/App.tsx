/** Composition root that binds the application state hook to the root View. */
import { AppView } from "./components/AppView";
import { useAppController } from "./hooks/useAppController";
import "./styles/App.css";

function App() {
  const viewModel = useAppController();
  return <AppView viewModel={viewModel} />;
}

export default App;
