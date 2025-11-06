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
  groupId?: string; // NEW: Which group this card belongs to (if any)
}

// Partial image data type for logging
export interface ImageMetadata {
  image_id: string;
  x: number;
  y: number
  filepath: string;
  description: string; // long description
  source: string;
  user: number;
  groupId?: string;
}

export interface DragItem {
  id: string;
  type?: string;
  oldX: number;
  oldY: number;
  offsetX: number;
  offsetY: number;
  groupId?: string; // NEW: Which group this item belongs to (if any)
}

// Props interfaces for components
export interface BinProps {
  id: string;
  images: ImageData[];
  updateImageData: (imageId: string, data: Partial<ImageData>) => void;
  onDescriptionsUpdate: (id: string, newShortDesc: string, newLongDesc: string) => void;
  onDelete: (id: string) => void | Promise<void>;
  onTrash: (id: string) => void;
  onUnTrash: (id: string) => void;
  isSuggestedOrderBin?: boolean;
}

export interface DraggableCardProps {
  image: ImageData;
  index: number;
  onDescriptionsUpdate: (id: string, newShortDesc: string, newLongDesc: string) => void;
  onDelete: (id: string) => void | Promise<void>;
  onTrash: (id: string) => void;
  onUnTrash: (id: string) => void;
  draggable?: boolean;
}

// Group data structure
export interface GroupData {
  id: string;
  number: number;
  name: string;
  description: string;
  x: number;
  y: number;
  cards: ImageData[];
  created_at: string;
  last_modified: string;
}

// NEW: Enhanced Group component props
export interface GroupDivProps {
  id: string;
  number: number;
  name: string;
  description: string;
  initialPosition: { x: number; y: number };
  cards: ImageData[];
  onClose: (id: string) => void;
  onPositionUpdate: (x: number, y: number) => void;
  onCardAdd: (cardId: string, groupId: string) => void;
  onCardRemove: (cardId: string, groupId: string) => void;
  onNameChange: (groupId: string, newName: string) => void;
  onDescriptionChange: (groupId: string, newDescription: string) => void;
  onGroupUpdate: (groupId: string, updates: { name?: string; description?: string }) => void;
  storyBinRef: React.RefObject<HTMLDivElement | null>;
}

// Lightweight metadata for logging
export interface GroupMetadata {
  id: string;
  number: number;
  name: string;
  description: string;
  initialPosition: { x: number; y: number };
  cards: ImageData[];
}
