export type DocumentWithFullscreen = Document & {
	webkitFullscreenElement?: Element | null;
	webkitExitFullscreen?: () => Promise<void>;
};

export type ElementWithFullscreen = HTMLElement & {
	webkitRequestFullscreen?: () => Promise<void>;
};
