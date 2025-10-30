import { GroupData, GroupDivProps } from "../types/types";


export const formatGroupMetadata = async (group: GroupDivProps | GroupData) => {
  return {
    id: group.id,
    number: group.number,
    name: group.name,
    description: group.description,
    card_ids: group.cards.map(card => card.id),
    card_count: group.cards.length
  };
};