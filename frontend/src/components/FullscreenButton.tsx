import { useCallback, useEffect, useState } from "react";
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
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 9L4 4m0 0h5M4 4v5m11 6l5 5m0 0v-5m0 5h-5"
					/>
				</svg>
			) : (
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
					/>
				</svg>
			)}
		</button>
	);
};

export default FullscreenButton;
