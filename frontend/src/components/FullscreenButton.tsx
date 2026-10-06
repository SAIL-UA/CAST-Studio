import { useCallback, useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { logAction } from "../utils/userActionLogger";
import type { ElementWithFullscreen, DocumentWithFullscreen } from "../types/Environment";

const getFullscreenElement = (): Element | null => {
	const doc = document as DocumentWithFullscreen;
	return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
};

const requestAppFullscreen = async () => {
	const el = document.documentElement as ElementWithFullscreen;
	if (el.requestFullscreen) {
		await el.requestFullscreen();
		return;
	}
	if (el.webkitRequestFullscreen) {
		await el.webkitRequestFullscreen();
	}
};

const exitAppFullscreen = async () => {
	const doc = document as DocumentWithFullscreen;
	if (doc.exitFullscreen) {
		await doc.exitFullscreen();
		return;
	}
	if (doc.webkitExitFullscreen) {
		await doc.webkitExitFullscreen();
	}
};

const FullscreenButton = () => {
	const [isFullscreen, setIsFullscreen] = useState(false);

	const syncFullscreenState = useCallback(() => {
		setIsFullscreen(!!getFullscreenElement());
	}, []);

	const toggleFullscreen = useCallback(async () => {
		try {
			if (getFullscreenElement()) {
				await exitAppFullscreen();
			} else {
				await requestAppFullscreen();
			}
		} catch (error) {
			console.error("Error toggling fullscreen");
		}
	}, []);

	useEffect(() => {
		syncFullscreenState();

		document.addEventListener("fullscreenchange", syncFullscreenState);
		document.addEventListener("webkitfullscreenchange", syncFullscreenState);

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "F11") return;
			event.preventDefault();
			void toggleFullscreen();
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("fullscreenchange", syncFullscreenState);
			document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [syncFullscreenState, toggleFullscreen]);

	return (
		<button
			log-id="toggle-fullscreen-button"
			className="w-auto h-auto rounded-full px-3 py-1 flex items-center justify-center gap-1 text-white font-bold text-sm transition-all duration-200"
			style={{
				cursor: "pointer",
				backgroundColor: "rgba(0, 92, 132, 0.5)",
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.backgroundColor = "rgba(0, 92, 132, 0.7)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.backgroundColor = "rgba(0, 92, 132, 0.5)";
			}}
			onClick={(e) => {
				logAction(e);
				void toggleFullscreen();
			}}
			title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen (F11)"}
			aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
		>
			{isFullscreen ? (
				<Minimize2 className="w-4 h-4" strokeWidth={1.5} aria-hidden />
			) : (
				<Maximize2 className="w-4 h-4" strokeWidth={1.5} aria-hidden />
			)}
		</button>
	);
};

export default FullscreenButton;
