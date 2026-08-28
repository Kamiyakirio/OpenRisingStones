/** Composition root that binds the application ViewModel to the root View. */
import { useAppViewModel } from "@/app/hooks/useAppViewModel";
import { AppView } from "@/app/AppView";
import "@/app/App.css";

function App() {
  const viewModel = useAppViewModel();
  return <AppView viewModel={viewModel} />;
}

export default App;
