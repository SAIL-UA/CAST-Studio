// Import dependencies
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { getImageDataAll, serveImage, updateImageData as updateImageDataAPI, createGroup, getGroups, updateGroup, deleteGroup } from '../services/api';
import { getImageUrl } from '../utils/imageUtils';

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
import { logAction } from '../utils/userActionLogger';


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
                groupId: img.group_id || undefined, // Map backend group_id to frontend groupId
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

    // Fetch groups from backend

    const fetchGroupsData = async () => {
        try {
            const response = await getGroups();
            if (response.status === 'success' && response.groups) {
                const backendGroups = response.groups.map((g: any) => ({
                    id: g.id,
                    number: g.number,
                    name: g.name,
                    description: g.description,
                    x: g.x,
                    y: g.y,
                    cards: g.images || [],
                    created_at: g.created_at,
                    last_modified: g.last_modified
                }));
                setGroupDivs(backendGroups);

                // Update next group number
                if (backendGroups.length > 0) {
                    const maxNumber = Math.max(...backendGroups.map((g: any) => g.number));
                    setNextGroupNumber(maxNumber + 1);
                }
            }

    const fetchGroups = async () => {
        try {
            const fetchedGroups = await getGroups();
            if (!fetchedGroups || fetchedGroups.length === 0) {
                setGroupDivs([]);
                return;
            }

            // Convert backend format to frontend format
            // Backend stores card IDs, frontend needs full ImageData objects
            const groupsWithCards = fetchedGroups.map((group: any) => {
                const cardIds = group.cards || [];

                const fullCards = cardIds
                    .map((cardId: string) => images.find(img => img.id === cardId))
                    .filter((card: ImageData | undefined): card is ImageData => card !== undefined)
                    .map((card: ImageData) => ({
                        ...card,
                        groupId: group.id, // Ensure groupId is set
                        image: getImageUrl(card.filepath)
                    }));

                return {
                    ...group,
                    cards: fullCards
                };
            });

            setGroupDivs(groupsWithCards);

            // Update nextGroupNumber to be max(group numbers) + 1
            const maxNumber = groupsWithCards.reduce((max: number, group: GroupData) =>
                Math.max(max, group.number), 0);
            setNextGroupNumber(maxNumber + 1);

        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchUserData();
        fetchGroupsData();
    }, []);

    // Fetch groups after images are loaded
    useEffect(() => {
        if (!loading && images.length >= 0) {
            fetchGroups();
        }
    }, [loading, images.length]);

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
    const handleDelete = (imageId: string) => {
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
    const handleCreateGroup = async () => {
        // Calculate initial position at top-right of storyboard
        let initialX = 0;
        let initialY = 0;

        if (storyBinRef.current) {
            const rect = storyBinRef.current.getBoundingClientRect();
            // Position at top-right of storyboard, accounting for group size (320px width)
            initialX = rect.width - 320 - 10; // 10px margin from right edge
            initialY = 10; // 10px margin from top
        }


        try {
            // Create group in backend
            const response = await createGroup({
                number: nextGroupNumber,
                name: `Group ${nextGroupNumber}`,
                description: '',
                x: initialX,
                y: initialY
            });

            if (response.status === 'success') {
                const backendGroup = response.group;
                const newGroup: GroupData = {
                    id: backendGroup.id,
                    number: backendGroup.number,
                    name: backendGroup.name,
                    description: backendGroup.description,
                    x: backendGroup.x,
                    y: backendGroup.y,
                    cards: [],
                    created_at: backendGroup.created_at,
                    last_modified: backendGroup.last_modified
                };
                setGroupDivs(prev => [...prev, newGroup]);
                setNextGroupNumber(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error creating group:', error);
        }

        const groupData = {
            number: nextGroupNumber,
            name: `Group ${nextGroupNumber}`,
            description: '',
            x: initialX,
            y: initialY,
            cards: [],
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString()
        };

        const response = await createGroup(groupData);
        if (response.status !== 201) {
            console.error('Error creating group:', response.data.errors);
            return;
        }
        
        const newGroup = response.data.group as GroupData;
        
        setGroupDivs(prev => [...prev, newGroup]);
        setNextGroupNumber(prev => prev + 1);
        return newGroup;

    };

    // Handle closing a specific group div
    const handleCloseGroup = async (groupId: string) => {
        try {

            // Delete group from backend (automatically returns images to workspace)
            await deleteGroup(groupId);

            // Delete group from backend
            const response = await deleteGroup(groupId);
            if (response.status !== 200) {
                console.error('Error deleting group:', response.data);
                return;
            }

            // Find all cards in this group and update their group_id to null
            const cardsInGroup = images.filter(img => img.groupId === groupId);
            for (const card of cardsInGroup) {
                await updateImageDataAPI(card.id, { group_id: null, in_storyboard: true });
            }


            // Update local state: return all cards from this group to the workspace
            setImages(prev => prev.map(img =>
                img.groupId === groupId
                    ? { ...img, groupId: undefined, in_storyboard: true }
                    : img
            ));



            // Remove group from local state

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
        } catch (error) {

            console.error('Error deleting group:', error);

            console.error('Error closing group:', error);

        }
    };

    // Handle adding card to group
    const handleCardAddToGroup = async (cardId: string, groupId: string) => {
        try {

            // Add image to group in backend
            await updateImageDataAPI(cardId, groupId);

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

            // Find the card with complete image data
            const cardToAdd = images.find(img => img.id === cardId);
            if (!cardToAdd) return;

            // Fetch current group from backend FIRST to get authoritative card list
            // This prevents race conditions when adding multiple cards quickly
            const currentGroupData = await getGroups(groupId);
            if (!currentGroupData) return;

            // Check if card is already in the group (ensure uniqueness)
            const currentCardIds = currentGroupData.cards || [];
            if (currentCardIds.includes(cardId)) {
                console.log(`Card ${cardId} already in group ${groupId}, skipping`);
                return;
            }

            // Now update both image and group in parallel
            const updatedCardIds = [...currentCardIds, cardId];
            await Promise.all([
                updateImageDataAPI(cardId, { group_id: groupId }),
                updateGroup(groupId, { cards: updatedCardIds })
            ]);

            // Create card with served image URL for local state
            const cardWithImage = {
                ...cardToAdd,
                image: getImageUrl(cardToAdd.filepath),
                groupId: groupId
            };

            // Update local state: update the card's groupId

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
        } catch (error) {
            console.error('Error adding image to group:', error);

            // Update local state: add card to group's cards array (only if not already present)
            setGroupDivs(prev => prev.map(group => {
                if (group.id === groupId) {
                    // Check if card already exists in the group
                    const cardExists = group.cards.some(card => card.id === cardId);
                    if (cardExists) {
                        return group; // Don't add duplicate
                    }
                    return {
                        ...group,
                        cards: [...group.cards, cardWithImage],
                        last_modified: new Date().toISOString()
                    };
                }
                return group;
            }));
        } catch (error) {
            console.error('Error adding card to group:', error);

        }
    };

    // Handle removing card from group
    const handleCardRemoveFromGroup = async (cardId: string, groupId: string) => {
        try {

            // Remove image from group in backend
            await updateImageDataAPI(cardId);

            // Update the card's groupId to null and ensure it's in the storyboard

            // Update image's group_id to null in backend
            await updateImageDataAPI(cardId, { group_id: null, in_storyboard: true });

            // Fetch current group from backend to get authoritative card list
            // This prevents race conditions when removing multiple cards quickly
            const currentGroupData = await getGroups(groupId);
            if (!currentGroupData) return;

            // Update group's cards array in backend (remove the card ID)
            const currentCardIds = currentGroupData.cards || [];
            const updatedCardIds = currentCardIds.filter((id: string) => id !== cardId);
            await updateGroup(groupId, { cards: updatedCardIds });

            // Update local state: update the card's groupId to null and ensure it's in the storyboard

            setImages(prev => prev.map(img =>
                img.id === cardId
                    ? { ...img, groupId: undefined, in_storyboard: true }
                    : img
            ));


            // Remove card from group's cards array

            // Update local state: remove card from group's cards array

            setGroupDivs(prev => prev.map(group =>
                group.id === groupId
                    ? {
                        ...group,
                        cards: group.cards.filter(card => card.id !== cardId),
                        last_modified: new Date().toISOString()
                      }
                    : group
            ));
        } catch (error) {

            console.error('Error removing image from group:', error);

            console.error('Error removing card from group:', error);

        }
    };

    // Handle group name change
    const handleGroupNameChange = async (groupId: string, newName: string) => {
        try {
            // Update group name in backend

            await updateGroup(groupId, { name: newName });


            await updateGroup(groupId, { name: newName });

            // Update local state

            setGroupDivs(prev => prev.map(group =>
                group.id === groupId
                    ? { ...group, name: newName, last_modified: new Date().toISOString() }
                    : group
            ));
        } catch (error) {
            console.error('Error updating group name:', error);
        }
    };

    // Handle group description change
    const handleGroupDescriptionChange = async (groupId: string, newDescription: string) => {
        try {
            // Update group description in backend

            await updateGroup(groupId, { description: newDescription });


            await updateGroup(groupId, { description: newDescription });

            // Update local state

            setGroupDivs(prev => prev.map(group =>
                group.id === groupId
                    ? { ...group, description: newDescription, last_modified: new Date().toISOString() }
                    : group
            ));
        } catch (error) {
            console.error('Error updating group description:', error);
        }


    };

    // Handle batch group updates (for modal save)
    const handleGroupUpdate = async (groupId: string, updates: { name?: string; description?: string }) => {
        try {
            // Only include changed fields
            if (Object.keys(updates).length === 0) {
                return; // No changes
            }

            // Single API call with all changes
            await updateGroup(groupId, updates);

            // Update local state
            setGroupDivs(prev => prev.map(group =>
                group.id === groupId
                    ? { ...group, ...updates, last_modified: new Date().toISOString() }
                    : group
            ));
        } catch (error) {
            console.error('Error updating group:', error);
        }

    };

    // Show only images that are in the storyboard (in_storyboard === true) and NOT in any group
    const workspaceImages = images
        .filter(img => img.in_storyboard === true && !img.groupId)
        .map(img => ({
            ...img,
            image: getImageUrl(img.filepath)
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
            <div id="story-bin-header" className="flex w-full flex-0 items-center justify-start p-2 flex-shrink-0 grid-background">
                <UploadButton />
                <GroupButton onClick={handleCreateGroup} />
                <GenerateStoryButton images={workspaceImages} setRightNarrativePatternsOpen={setRightNarrativePatternsOpen} setSelectedPattern={setSelectedPattern} storyLoading={storyLoading} setStoryLoading={setStoryLoading} hasGroups={groupDivs.length > 0} />
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
                        onPositionUpdate={async (newX, newY) => {
                            try {
                                // Update position in backend
                                await updateGroup(group.id, { x: newX, y: newY });

                                // Update local state
                                setGroupDivs(prev => prev.map(g =>
                                    g.id === group.id ? { ...g, x: newX, y: newY, last_modified: new Date().toISOString() } : g
                                ));
                            } catch (error) {
                                console.error('Error updating group position:', error);
                            }
                        }}
                        onCardAdd={handleCardAddToGroup}
                        onCardRemove={handleCardRemoveFromGroup}
                        onNameChange={handleGroupNameChange}
                        onDescriptionChange={handleGroupDescriptionChange}
                        onGroupUpdate={handleGroupUpdate}
                        storyBinRef={storyBinRef}
                    />
                ))}
            </div>
        </div>
    )
}

export default StoryBoard;