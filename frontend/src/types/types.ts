// TypeScript interfaces for drag and drop functionality

export interface ImageData {
  id: string;
  filename: string;
  short_desc?: string;
  long_desc?: string;
  in_storyboard: boolean;
  x: number;
  y: number;
}

export interface DragItem {
  id: string;
  oldX: number;
  oldY: number;
  offsetX: number;
  offsetY: number;
}

// Props interfaces for components
export interface BinProps {
  id: string;
  images: ImageData[];
  updateImageData: (imageId: string, data: Partial<ImageData>) => void;
  onDescriptionsUpdate: (id: string, newShortDesc: string, newLongDesc: string) => void;
  onDelete: (id: string) => void;
  onTrash: (id: string) => void;
  onUnTrash: (id: string) => void;
  isSuggestedOrderBin?: boolean;
}

export interface DraggableCardProps {
  image: ImageData;
  onDescriptionsUpdate: (id: string, newShortDesc: string, newLongDesc: string) => void;
  onDelete: (id: string) => void;
  onTrash: (id: string) => void;
  onUnTrash: (id: string) => void;
  draggable?: boolean;
}
