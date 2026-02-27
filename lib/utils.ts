export const isIterable = <TValue>(
    value: Iterable<TValue> | unknown
): value is Iterable<TValue> => {
    return (
        value != null &&
        typeof value === "object" &&
        Symbol.iterator in value &&
        typeof value[Symbol.iterator] === "function"
    )
}

export const isAsyncIterable = <TValue>(
    value: AsyncIterable<TValue> | unknown
): value is AsyncIterable<TValue> => {
    return (
        value != null &&
        typeof value === "object" &&
        Symbol.asyncIterator in value &&
        typeof value[Symbol.asyncIterator] === "function"
    )
}
