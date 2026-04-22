// Generate a consistent color from a string
export const getAvatarColor = (str: string) => {
    const colors = ['#4d8497', '#be6d6d', '#6d8fbe', '#8fbe6d', '#be8f6d', '#6dbe8f', '#8f6dbe', '#be6d8f'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};
