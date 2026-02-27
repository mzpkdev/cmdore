import type Argument from "./Argument"
import type Option from "./Option"

export type Argv<
    TOptionArray extends readonly Option[] = readonly Option<string, any>[],
    TArgumentArray extends readonly Argument[] = readonly Argument<
        string,
        any
    >[]
> = {
    [TKey in TOptionArray[number] as TKey["name"]]: TKey extends Option<
        any,
        infer TValue
    >
        ? TValue
        : unknown
} & {
    [TKey in TArgumentArray[number] as TKey["name"]]: TKey extends Argument<
        any,
        infer TValue
    >
        ? TKey["variadic"] extends true
            ? TValue[]
            : TValue
        : unknown
}

export type Command<
    TOptionArray extends readonly Option<string, any>[] = readonly Option[],
    TArgumentArray extends readonly Argument<
        string,
        any
    >[] = readonly Argument[]
> = {
    name: string
    description?: string
    examples?: string[]
    arguments?: TArgumentArray
    options?: TOptionArray
    run?: (
        this: Command<TOptionArray, TArgumentArray>,
        argv: Argv<TOptionArray, TArgumentArray>
    ) => AsyncIterable<unknown> | Iterable<unknown> | unknown[] | unknown
    // [property: string]: unknown
}

export const defineCommand = <
    const TOptionArray extends readonly Option<string, any>[],
    const TArgumentArray extends readonly Argument<string, any>[]
>(
    command: Command<TOptionArray, TArgumentArray>
): Command<TOptionArray, TArgumentArray> => command

export default Command
