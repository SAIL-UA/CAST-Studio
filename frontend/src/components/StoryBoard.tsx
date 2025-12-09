// Import dependencies
import React, { useState, useEffect, useRef } from 'react';
import { updateImageData as updateImageDataAPI, createGroup, getGroups, updateGroup, deleteGroup, createScaffold, getScaffolds, updateScaffold, deleteScaffold } from '../services/api';
import { logAction } from '../utils/userActionLogger';

// Import components
import UploadButton from './UploadButton';
import GenerateStoryButton from './GenerateStoryButton';
import CraftStoryButton from './CraftStoryButton';
import GroupButton from './GroupButton';
import FeedbackButton from './FeedbackButton';
import GroupDiv from './GroupDiv';
import Bin from './Bin';
import ClearAllButton from './ClearAllButton';

// Import scaffolds
import CauseEffect from './scaffolds/CauseEffect';

// Import types
import { ImageData, GroupData, ScaffoldData } from '../types/types';
import { SCAFFOLD_NUMBER_TO_PATTERN, SCAFFOLD_VALID_GROUP_NUMBERS } from '../types/scaffoldMappings';


// Define props interface
type StoryBoardProps = {
    setRightNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedPattern: React.Dispatch<React.SetStateAction<string>>;
    selectedPattern: string;
    storyLoading: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    images: ImageData[];
    setImages: React.Dispatch<React.SetStateAction<ImageData[]>>;
    loading: boolean;
    fetchUserData: () => Promise<void>;
    updateImageData: (imageId: string, data: Partial<ImageData>) => void;
    handleImageRecycle: (imageId: string) => void;
    handleImageRestore: (imageId: string) => void;
}

// StoryBoard component
const StoryBoard = ({ setRightNarrativePatternsOpen, setSelectedPattern, selectedPattern, storyLoading, setStoryLoading, images, setImages, loading, fetchUserData, updateImageData, handleImageRecycle, handleImageRestore }: StoryBoardProps) => {

    // States
    const [groupDivs, setGroupDivs] = useState<GroupData[]>([]);
    const [scaffold, setScaffold] = useState<ScaffoldData | null>(null);
    const [nextGroupNumber, setNextGroupNumber] = useState(1);
    
    // References
    const storyBinRef = useRef<HTMLDivElement>(null);

    // Fetch groups from backend
    const fetchGroups = async () => {
        try {
            const fetchedGroups = await getGroups();
            if (!fetchedGroups || fetchedGroups.length === 0) {
                setGroupDivs([]);
                return;
            }
    
            // Derive cards from images array using group_id
            const groupsWithCards = fetchedGroups.map((group: any) => {
                // Filter images that belong to this group
                const fullCards = images
                    .filter(img => img.groupId === group.id)
                    .map((card: ImageData) => ({
                        ...card,
                        groupId: group.id  // Ensure groupId is set
                    }));
    
                return {
                    ...group,
                    cards: fullCards,  // Derived from images state array
                    scaffoldId: group.scaffold_id || undefined,  // Transform snake_case to camelCase
                    scaffold_group_number: group.scaffold_group_number || undefined  // Preserve scaffold_group_number from backend
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

    // Fetch scaffolds from backend
    const fetchScaffolds = async () => {
        try {
            const fetchedScaffolds = await getScaffolds();
            if (!fetchedScaffolds || fetchedScaffolds.length === 0) {
                setSelectedPattern('');
                setScaffold(null);
                return;
            }

            // For now, assume one scaffold per user (or take the first one)
            // You might want to handle multiple scaffolds differently
            const scaffoldData = fetchedScaffolds[0];
            
            // Derive cards from images array using scaffold_id
            const scaffoldCards = images
                .filter(img => img.scaffoldId === scaffoldData.id)
                .map((card: ImageData) => ({
                    ...card,
                    scaffoldId: scaffoldData.id
                }));

            // Derive groups that belong to this scaffold
            const scaffoldGroups = groupDivs
                .filter(group => group.scaffoldId === scaffoldData.id)
                .map((group: GroupData) => ({
                    ...group,
                    cards: images
                        .filter(img => img.groupId === group.id)
                        .map((card: ImageData) => ({
                            ...card,
                            groupId: group.id
                        }))
                }));

            const scaffoldWithCards: ScaffoldData = {
                ...scaffoldData,
                cards: scaffoldCards,
                groups: scaffoldGroups  // Populate groups that belong to scaffold
            };

            setScaffold(scaffoldWithCards);
            
            // Set selectedPattern based on scaffold name/number
            const pattern = SCAFFOLD_NUMBER_TO_PATTERN[scaffoldData.number];
            if (pattern) {
                setSelectedPattern(pattern);
            }

        } catch (error) {
            console.error('Error fetching scaffolds:', error);
        }
    };

    // Fetch groups and scaffolds after images are loaded
    useEffect(() => {
        if (!loading && images.length > 0) {
            fetchGroups();
            fetchScaffolds();
        }
    }, [loading, images]);

    // Handle creating scaffold when pattern is selected (if scaffold doesn't exist)
    useEffect(() => {
        const handleCreateScaffoldIfNeeded = async () => {
            // Only create scaffold if pattern is selected and scaffold doesn't exist
            if (selectedPattern && selectedPattern !== '' && !scaffold) {
                try {
                    // Calculate initial position
                    let initialX = 50;
                    let initialY = 50;
                    
                    if (storyBinRef.current) {
                        const rect = storyBinRef.current.getBoundingClientRect();
                        initialX = rect.width / 2 - 250; // Center scaffold (assuming 500px width)
                        initialY = 50;
                    }

                    const response = await createScaffold(selectedPattern, initialX, initialY);
                    if (response.scaffold) {
                        const newScaffold: ScaffoldData = {
                            ...response.scaffold,
                            cards: [],
                            groups: []
                        };
                        setScaffold(newScaffold);
                    }
                } catch (error) {
                    console.error('Error creating scaffold:', error);
                }
            }
        };

        handleCreateScaffoldIfNeeded();
    }, [selectedPattern, scaffold]);

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
    const handleDelete = async (imageId: string) => {
        // Immediately remove from local state for instant UI update
        setImages((prevImages) => prevImages.filter(img => img.id !== imageId));
        
        // Then refresh from backend to ensure consistency
        await fetchUserData();
        await fetchGroups();
        await fetchScaffolds();
    };

    // Handle creating new group div
    const handleCreateGroup = async (): Promise<GroupData | undefined> => {
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

            if (response.status === 201 || response.status === 200) {
                const backendGroup = response.data.group;
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
                return newGroup;
            }
        } catch (error) {
            console.error('Error creating group:', error);
        }
        return undefined;
    };

    // Handle closing a specific group div
    const handleCloseGroup = async (groupId: string) => {
        try {
            // Delete group from backend (automatically returns images to workspace)
            await deleteGroup(groupId);

            // Find all cards in this group and update their group_id to null
            const cardsInGroup = images.filter(img => img.groupId === groupId);
            for (const card of cardsInGroup) {
                await updateImageDataAPI(card.id, { group_id: null, in_storyboard: true });
            }

            // Update local state: return all cards from this group to the workspace (preserve index)
            setImages(prev => prev.map(img =>
                img.groupId === groupId
                    ? { ...img, groupId: undefined, in_storyboard: true, index: img.index }
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

            // If group was in a scaffold, also update scaffold state
            const deletedGroup = groupDivs.find(g => g.id === groupId);
            if (deletedGroup?.scaffoldId && scaffold && scaffold.id === deletedGroup.scaffoldId) {
                setScaffold(prev => prev ? {
                    ...prev,
                    groups: prev.groups.filter(g => g.id !== groupId)
                } : null);
            }
        } catch (error) {
            console.error('Error closing group:', error);
        }
    };

    // Handle adding card to group
    const handleCardAddToGroup = async (cardId: string, groupId: string) => {
        try {
            const cardToAdd = images.find(img => img.id === cardId);
            if (!cardToAdd) return;
    
            // Check if card is already in the group (using local state)
            if (cardToAdd.groupId === groupId) {
                console.log(`Card ${cardId} already in group ${groupId}, skipping`);
                return;
            }
    
            // Only update image's group_id - no need to update group.cards
            await updateImageDataAPI(cardId, { group_id: groupId });
    
            // Update local state: update the card's groupId (preserve index)
            setImages(prev => prev.map(img =>
                img.id === cardId ? { ...img, groupId: groupId, index: img.index } : img
            ));
    
            // Update group's cards array by deriving from updated images
            // The cards will be automatically updated when fetchGroups runs or we can derive here
            setGroupDivs(prev => prev.map(group => {
                if (group.id === groupId) {
                    // Derive cards from images with this groupId
                    const updatedCards = images
                        .filter(img => img.id === cardId || img.groupId === groupId)
                        .map(img => ({
                            ...img,
                            groupId: groupId
                        }));
                    
                    return {
                        ...group,
                        cards: updatedCards,
                        last_modified: new Date().toISOString()
                    };
                }
                return group;
            }));
        } catch (error) {
            console.error('Error adding image to group:', error);
        }
    };

    // Handle removing card from group
    const handleCardRemoveFromGroup = async (cardId: string, groupId: string) => {
        try {
            // Only update image's group_id to null - no need to update group.cards
            await updateImageDataAPI(cardId, { group_id: null, in_storyboard: true });
    
            // Update local state: update the card's groupId to null (preserve index)
            setImages(prev => prev.map(img =>
                img.id === cardId
                    ? { ...img, groupId: undefined, in_storyboard: true, index: img.index }
                    : img
            ));
    
            // Update group's cards array by deriving from updated images
            setGroupDivs(prev => prev.map(group => {
                if (group.id === groupId) {
                    // Derive cards from images with this groupId (excluding the removed one)
                    const updatedCards = images
                        .filter(img => img.id !== cardId && img.groupId === groupId)
                        .map(img => ({
                            ...img,
                            groupId: groupId
                        }));
                    
                    return {
                        ...group,
                        cards: updatedCards,
                        last_modified: new Date().toISOString()
                    };
                }
                return group;
            }));
        } catch (error) {
            console.error('Error removing card from group:', error);
        }
    };

    // Handle group name change
    const handleGroupNameChange = async (groupId: string, newName: string) => {
        try {
            // Update group name in backend
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

    // Handle scaffold close
    const handleScaffoldClose = async () => {
        try {
            // Store scaffold ID before deletion for cleanup
            const scaffoldIdToRemove = scaffold?.id;

            // Delete scaffold from backend (backend will clear scaffold associations)
            await deleteScaffold();

            // Update local state: remove scaffold associations from images
            setImages(prev => prev.map(img =>
                img.scaffoldId === scaffoldIdToRemove
                    ? { ...img, scaffoldId: undefined, scaffold_group_number: undefined }
                    : img
            ));

            // Update local state: remove scaffold associations from groups
            setGroupDivs(prev => prev.map(group =>
                group.scaffoldId === scaffoldIdToRemove
                    ? { ...group, scaffoldId: undefined, scaffold_group_number: undefined }
                    : group
            ));

            // Clear scaffold state
            setScaffold(null);
            setSelectedPattern('');

            // Refresh data from backend to ensure consistency
            await fetchUserData();
            await fetchGroups();
        } catch (error) {
            console.error('Error closing scaffold:', error);
        }
    };

    // Handle group being dropped into scaffold
    const handleGroupAddToScaffold = async (groupId: string, scaffoldId: string, scaffoldGroupNumber?: number) => {
        try {
            // Transform camelCase to snake_case for backend
            const updateData: any = { 
                scaffold_id: scaffoldId,
                scaffold_group_number: scaffoldGroupNumber 
            };
            
            // Update group's scaffold_id in backend
            await updateGroup(groupId, updateData);

            // Update local state and scaffold immediately
            setGroupDivs(prev => {
                const updatedGroups = prev.map(group =>
                    group.id === groupId
                        ? { ...group, scaffoldId: scaffoldId, scaffold_group_number: scaffoldGroupNumber, last_modified: new Date().toISOString() }
                        : group
                );

                // Update scaffold state immediately with the updated groups
                if (scaffold && scaffold.id === scaffoldId) {
                    const updatedScaffoldGroups = updatedGroups
                        .filter(group => group.scaffoldId === scaffoldId)
                        .map((group: GroupData) => ({
                            ...group,
                            cards: images
                                .filter(img => img.groupId === group.id)
                                .map((card: ImageData) => ({
                                    ...card,
                                    groupId: group.id
                                }))
                        }));

                    setScaffold(prev => prev ? {
                        ...prev,
                        groups: updatedScaffoldGroups
                    } : null);
                }

                return updatedGroups;
            });
        } catch (error) {
            console.error('Error adding group to scaffold:', error);
        }
    };

    // Handle group being removed from scaffold
    const handleGroupRemoveFromScaffold = async (groupId: string) => {
        try {
            // Transform camelCase to snake_case for backend
            const updateData: any = { 
                scaffold_id: null,
                scaffold_group_number: null 
            };
            
            // Update group's scaffold_id to null in backend
            await updateGroup(groupId, updateData);

            // Update local state
            setGroupDivs(prev => prev.map(group =>
                group.id === groupId
                    ? { ...group, scaffoldId: undefined, scaffold_group_number: undefined, last_modified: new Date().toISOString() }
                    : group
            ));

            // Refresh scaffold
            await fetchScaffolds();
        } catch (error) {
            console.error('Error removing group from scaffold:', error);
        }
    };

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

    const workspaceImages = images.filter(img => 
        img.in_storyboard === true && !img.groupId && !img.scaffoldId
    );

    // Filter groups: only show groups that don't belong to a scaffold in main storyboard
    const mainStoryboardGroups = groupDivs.filter(group => !group.scaffoldId);

    // Visible component
    return (
        <div id="story-board-container" className="flex flex-col h-full w-full bg-white">
            <div id="story-bin-header" className="flex w-full flex-0 items-center justify-start p-2 flex-shrink-0 grid-background">
                <UploadButton onUploaded={fetchUserData}/>
                <GroupButton onClick={handleCreateGroup} />
                <GenerateStoryButton setRightNarrativePatternsOpen={setRightNarrativePatternsOpen} setSelectedPattern={setSelectedPattern} selectedPattern={selectedPattern} storyLoading={storyLoading} />
                <CraftStoryButton images={workspaceImages} storyLoading={storyLoading} setStoryLoading={setStoryLoading} hasGroups={groupDivs.length > 0} />
                <FeedbackButton />

            </div>
            <div id = "story-bin-wrapper" className="flex-1 min-h-0 relative overflow-auto" ref={storyBinRef}>
                <Bin
                    id="story-bin"
                    images={workspaceImages}
                    updateImageData={updateImageData}
                    onDescriptionsUpdate={handleDescriptionsUpdate}
                    onDelete={handleDelete}
                    onTrash={handleImageRecycle}
                    onUnTrash={handleImageRestore}
                    isSuggestedOrderBin={false}
                />
                {/* Render Cause and Effect scaffold when pattern is selected */}
                {selectedPattern === 'cause_and_effect' && scaffold && (
                    <CauseEffect
                        images={images}
                        storyBinRef={storyBinRef}
                        setSelectedPattern={setSelectedPattern}
                        scaffold={scaffold}
                        updateImageData={updateImageData}
                        onPositionUpdate={async (newX: number, newY: number) => {
                            try {
                                await updateScaffold(scaffold.id, { x: newX, y: newY });
                                setScaffold(prev => prev ? { ...prev, x: newX, y: newY } : null);
                            } catch (error) {
                                console.error('Error updating scaffold position:', error);
                            }
                        }}
                        onClose={handleScaffoldClose}
                        onGroupAdd={handleGroupAddToScaffold}
                        onGroupRemove={handleGroupRemoveFromScaffold}
                        onCardAddToGroup={handleCardAddToGroup}
                        onCardRemoveFromGroup={handleCardRemoveFromGroup}
                        onGroupNameChange={handleGroupNameChange}
                        onGroupDescriptionChange={handleGroupDescriptionChange}
                        onGroupUpdate={handleGroupUpdate}
                    />
                )}
                {/* Render groups directly in the scrollable container - only groups without scaffold */}
                {mainStoryboardGroups.map(group => (
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
                        scaffoldId={group.scaffoldId}
                    />
                ))}
                {/* ClearAll button - positioned in bottom left */}
                <ClearAllButton 
                    images={images}
                    setImages={setImages}
                    setGroupDivs={setGroupDivs}
                    setScaffold={setScaffold}
                    setSelectedPattern={setSelectedPattern}
                    onClearComplete={async () => {
                        await fetchUserData();
                        await fetchGroups();
                        await fetchScaffolds();
                    }}
                />
            </div>
        </div>
    )
}

export default StoryBoard;