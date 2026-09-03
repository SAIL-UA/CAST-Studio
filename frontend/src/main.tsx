import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { AppProviders } from "./contexts/AppProviders";
import "./styles/main.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<DndProvider backend={HTML5Backend}>
			<AppProviders>
				<App />
			</AppProviders>
		</DndProvider>
	</StrictMode>
);
