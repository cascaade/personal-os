export function concat(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ");
}
