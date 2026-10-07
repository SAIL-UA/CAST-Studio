/** Shared hover/disabled/type scale for storyboard toolbar actions */
export const toolbarBtnBase =
	"text-xs hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 " +
	"transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

export const toolbarBtnPill = `${toolbarBtnBase} rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1`;

export const toolbarBtnRound = `${toolbarBtnBase} rounded-full px-3 py-1 mx-1`;
