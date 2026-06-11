export function useInitials() {
    const getInitials = (fullName: string): string => {
        const names = fullName.trim().split(' ');

        if (names.length === 0) {
            return '';
        }
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }

        return `${names[0].charAt(0)}${names.at(-1)?.charAt(0) ?? ''}`.toUpperCase();
    };

    return getInitials;
}
