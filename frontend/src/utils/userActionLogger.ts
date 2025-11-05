import { logUserAction } from "../services/api";

type UserActionType = "click" | "hover" | "drag" | "drop";

interface ActionContext {
  actionType: UserActionType;
  elementId: string;
}

const getElementId = (element: HTMLElement | null): string => {
  if (!element) return "unknown";
  return (
    element.getAttribute("log-id") ||
    element.id ||
    element.classList.toString() ||
    "unknown"
  );
};

const getActionTypeFromEvent = (event: React.SyntheticEvent): UserActionType => {
  switch (event.type) {
    // treat blur as click for now
    case "blur":
    case "click":
      return "click";
    case "mouseenter":
    case "mouseover":
      return "hover";
    case "dragstart":
    case "dragend":
      return "drag";
    case "drop":
      return "drop";
    default:
      console.error(`Unrecognized user action type: ${event.type}`);
      return "click"; // Default fallback
  }
};

export const logAction = async (
  source: React.SyntheticEvent | ActionContext,
  stateInfo?: Record<string, any>
) => {
  let actionType: UserActionType;
  let elementId: string = "unknown";

  // If called with an event
  if ("type" in source) {
    const event = source;
    const targetElement = event.currentTarget as HTMLElement | null;
    actionType = getActionTypeFromEvent(event);
    elementId = getElementId(targetElement);
  }
  // If called with a pre-captured context
  else {
    actionType = source.actionType;
    elementId = source.elementId;
  }

  try {
    await logUserAction(actionType, elementId, stateInfo);
  } catch (err) {
    console.error(`Failed to log ${actionType} for ${elementId}:`, err);
  }
};

export const captureActionContext = (e: React.SyntheticEvent): ActionContext => ({
  actionType: getActionTypeFromEvent(e),
  elementId: getElementId(e.currentTarget as HTMLElement),
});
