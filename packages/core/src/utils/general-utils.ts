export function undefinedIfFalsey(v: any) {
    if (!v) return undefined;
    else return v;
}

export function emptyStringIfFalsey(v: any) {
    if (!v) return "";
    else return v;
}
