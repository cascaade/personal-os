export function containsEmoji(text: string): boolean {
    return /\p{Extended_Pictographic}/u.test(text);
}
