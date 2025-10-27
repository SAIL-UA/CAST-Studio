// Import dependencies
import { NavigateFunction } from "react-router-dom";


// Check auth and redirect to login if not authenticated
const handleAuthRequired = (userAuthenticated: boolean, navigate: NavigateFunction) => {
    if (!userAuthenticated) {
        navigate('/login');
    }
}

export { handleAuthRequired };

// Normalized mouse position utility
interface NormalizedPosition {
  x: number; // 0 to 1
  y: number; // 0 to 1
}
type TargetElement = Window | HTMLElement;
function isHTMLElement(el: TargetElement): el is HTMLElement {
  return (el as HTMLElement).getBoundingClientRect !== undefined;
}
function getNormalizedPosition(
  event: MouseEvent,
  element: TargetElement = window
): NormalizedPosition {
  const rect = isHTMLElement(element)
    ? element.getBoundingClientRect()
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  return { x, y };
}

export { getNormalizedPosition };