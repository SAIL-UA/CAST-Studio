// Import dependencies
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { getImageDataAll, serveImage, updateImageData as updateImageDataAPI } from '../services/api';

// Import components
import UploadButton from './UploadButton';
import GenerateStoryButton from './GenerateStoryButton';
import CraftStoryButton from './CraftStoryButton';
import GroupButton from './GroupButton';
import FeedbackButton from './FeedbackButton';
import SubmitButton from './SubmitButton';
import GroupDiv from './GroupDiv';
import Bin from './Bin';

// Import types
import { ImageData, GroupData } from '../types/types';


// Define props interface
type StoryBoardProps = {
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    storyLoading: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Use the new GroupData type instead of GroupInstance
// (keeping legacy name for now to minimize changes)

// StoryBoard component
const StoryBoard = ({ setRightNarrativePatternsOpen, setSelectedPattern, storyLoading, setStoryLoading }: StoryBoardProps) => {
    // State management for images
    const [images, setImages] = useState<ImageData[]>([]);
    const [loading, setLoading] = useState(true);
    
    // State for multiple group divs - now using GroupData
    const [groupDivs, setGroupDivs] = useState<GroupData[]>([]);
    const [nextGroupNumber, setNextGroupNumber] = useState(1);
    
    // Ref for story bin container
    const storyBinRef = useRef<HTMLDivElement>(null);

    // Fetch user data from backend
    const fetchUserData = async () => {
        await getImageDataAll()
        .then((response: any) => {
            if (response.data.images.length === 0) {
                setImages([]);
                return;
            } 
            const fetchedImages = response.data.images.map((img: any) => ({
                ...img,
                x: img.in_storyboard ? img.x : 0,
                y: img.in_storyboard ? img.y : 0,
            }));
            setImages(fetchedImages);
        })
        .catch((error) => {
            console.error('Error fetching user data:', error);
        })
        .finally(() => {
            setLoading(false);
        });
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchUserData();
    }, []);

    // Update image data (position, status, etc.)
    const updateImageData = async (imageId: string, data: Partial<ImageData>) => {
        try {
            const response = await updateImageDataAPI(imageId, data);
            if (response.status === 200) {
                console.log('Image data updated successfully');
                // Update local state
                setImages((prevImages) =>
                    prevImages.map((img) => 
                        img.id === imageId ? { ...img, ...data } : img
                    )
                );
            } else {
                console.error('Error updating image data:', response.data.errors);
            }
        } catch (error) {
            console.error('Error updating image data:', error);
        }
    };

    // Handle description updates
    const handleDescriptionsUpdate = (id: string, newShortDesc: string, newLongDesc: string) => {
        setImages((prevImages) =>
            prevImages.map((img) =>
                img.id === id
                    ? { ...img, short_desc: newShortDesc, long_desc: newLongDesc }
                    : img
            )
        );
    };

    // Handle image deletion
    const handleDelete = () => {
        fetchUserData(); // Refresh data after deletion
    };

    // Handle image trash
    const handleTrash = (imageId: string) => {
        updateImageData(imageId, { in_storyboard: false });
    };

    // Handle image untrash
    const handleUnTrash = (imageId: string) => {
        updateImageData(imageId, { in_storyboard: true });
    };

    // Handle creating new group div
    const handleCreateGroup = () => {
        // Calculate initial position at top-right of storyboard
        let initialX = 0;
        let initialY = 0;
        
        if (storyBinRef.current) {
            const rect = storyBinRef.current.getBoundingClientRect();
            // Position at top-right of storyboard, accounting for group size (320px width)
            initialX = rect.width - 320 - 10; // 10px margin from right edge
            initialY = 10; // 10px margin from top
        }
        
        const newGroup: GroupData = {
            id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            number: nextGroupNumber,
            name: `Group ${nextGroupNumber}`,
            description: '',
            x: initialX,
            y: initialY,
            cards: [],
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString()
        };
        setGroupDivs(prev => [...prev, newGroup]);
        setNextGroupNumber(prev => prev + 1);
    };

    // Handle closing a specific group div
    const handleCloseGroup = (groupId: string) => {
        // First, return all cards from this group to the workspace
        setImages(prev => prev.map(img => 
            img.groupId === groupId 
                ? { ...img, groupId: undefined, in_storyboard: true }
                : img
        ));
        
        setGroupDivs(prev => {
            // Filter out the group to be removed
            const remainingGroups = prev.filter(group => group.id !== groupId);
            
            // Renumber the remaining groups sequentially (1, 2, 3, ...)
            const renumberedGroups = remainingGroups.map((group, index) => ({
                ...group,
                number: index + 1
            }));
            
            return renumberedGroups;
        });
        
        // Update nextGroupNumber to be the count of remaining groups + 1
        setNextGroupNumber(prev => {
            const remainingCount = groupDivs.filter(group => group.id !== groupId).length;
            return remainingCount + 1;
        });
    };

    // Handle adding card to group
    const handleCardAddToGroup = (cardId: string, groupId: string) => {
        // Find the card with complete image data
        const cardToAdd = images.find(img => img.id === cardId);
        if (!cardToAdd) return;

        // Create card with served image URL
        const cardWithImage = {
            ...cardToAdd,
            image: serveImage(cardToAdd.filepath),
            groupId: groupId
        };

        // Update the card's groupId
        setImages(prev => prev.map(img => 
            img.id === cardId ? { ...img, groupId: groupId } : img
        ));
        
        // Add card to group's cards array
        setGroupDivs(prev => prev.map(group => 
            group.id === groupId 
                ? { 
                    ...group, 
                    cards: [...group.cards, cardWithImage],
                    last_modified: new Date().toISOString()
                  }
                : group
        ));
    };

    // Handle removing card from group
    const handleCardRemoveFromGroup = (cardId: string, groupId: string) => {
        // Update the card's groupId to null and ensure it's in the storyboard
        setImages(prev => prev.map(img => 
            img.id === cardId 
                ? { ...img, groupId: undefined, in_storyboard: true } 
                : img
        ));
        
        // Remove card from group's cards array
        setGroupDivs(prev => prev.map(group => 
            group.id === groupId 
                ? { 
                    ...group, 
                    cards: group.cards.filter(card => card.id !== cardId),
                    last_modified: new Date().toISOString()
                  }
                : group
        ));
    };

    // Handle group name change
    const handleGroupNameChange = (groupId: string, newName: string) => {
        setGroupDivs(prev => prev.map(group => 
            group.id === groupId 
                ? { ...group, name: newName, last_modified: new Date().toISOString() }
                : group
        ));
    };

    // Handle group description change
    const handleGroupDescriptionChange = (groupId: string, newDescription: string) => {
        setGroupDivs(prev => prev.map(group => 
            group.id === groupId 
                ? { ...group, description: newDescription, last_modified: new Date().toISOString() }
                : group
        ));
    };

    // Show only images that are in the storyboard (in_storyboard === true) and NOT in any group
    const workspaceImages = images
        .filter(img => img.in_storyboard === true && !img.groupId)
        .map(img => ({
            ...img,
            image: serveImage(img.filepath)
        }));

    // Loading state
    if (loading) {
        return (
            <div id="story-board-container" className="flex flex-col w-full h-full mt-4 bg-white">
                <div className="flex items-center justify-center h-full bg-white">
                    <div className="text-lg text-grey-darkest">Loading Story Board...</div>
                </div>
            </div>
        );
    }

    // Visible component
    return (
        <div id="story-board-container" className="flex flex-col h-full w-full bg-white">
            <div id="story-bin-header" className="flex w-full flex-0 items-center justify-start p-2 flex-shrink-0">
                <UploadButton />
                <GroupButton onClick={handleCreateGroup} />
                <GenerateStoryButton images={workspaceImages} setRightNarrativePatternsOpen={setRightNarrativePatternsOpen} setSelectedPattern={setSelectedPattern} storyLoading={storyLoading} setStoryLoading={setStoryLoading} />
                <CraftStoryButton />
                <FeedbackButton />
                <SubmitButton />

            </div>
            <div id = "story-bin-wrapper" className="flex-1 min-h-0 relative" ref={storyBinRef}>
                <Bin
                    id="story-bin"
                    images={workspaceImages}
                    updateImageData={updateImageData}
                    onDescriptionsUpdate={handleDescriptionsUpdate}
                    onDelete={handleDelete}
                    onTrash={handleTrash}
                    onUnTrash={handleUnTrash}
                    isSuggestedOrderBin={false}
                />
                {/* Render groups directly in the scrollable container so they scroll with content */}
                {groupDivs.map(group => (
                    <GroupDiv 
                        key={group.id}
                        id={group.id}
                        number={group.number}
                        name={group.name}
                        description={group.description}
                        cards={group.cards}
                        initialPosition={{ x: group.x, y: group.y }}
                        onClose={handleCloseGroup}
                        onPositionUpdate={(newX, newY) => {
                            setGroupDivs(prev => prev.map(g => 
                                g.id === group.id ? { ...g, x: newX, y: newY, last_modified: new Date().toISOString() } : g
                            ));
                        }}
                        onCardAdd={handleCardAddToGroup}
                        onCardRemove={handleCardRemoveFromGroup}
                        onNameChange={handleGroupNameChange}
                        onDescriptionChange={handleGroupDescriptionChange}
                        storyBinRef={storyBinRef}
                    />
                ))}
            </div>
        </div>
    )
}

export default StoryBoard;