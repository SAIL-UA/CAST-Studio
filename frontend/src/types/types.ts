// TypeScript interfaces for drag and drop functionality

export interface ImageData {
  id: string;
  user: number;
  filepath: string;
  short_desc: string;
  long_desc: string;
  long_desc_generating: boolean;
  source: string;
  in_storyboard: boolean;
  x: number;
  y: number;
  has_order: boolean;
  order_num: number;
  last_saved: string;
  created_at: string;
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
  index: number;
  onDescriptionsUpdate: (id: string, newShortDesc: string, newLongDesc: string) => void;
  onDelete: (id: string) => void;
  onTrash: (id: string) => void;
  onUnTrash: (id: string) => void;
  draggable?: boolean;
}
