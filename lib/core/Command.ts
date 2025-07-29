import Option from "./Option"


export type Arguments<TOptionArray extends Option[] = Option<string, any>[]> = {
    [TKey in TOptionArray[number] as TKey["name"]]: TKey extends Option<any, infer TValue>
        ? TValue
        : unknown
}

export type Command<TOptionArray extends Option[] = Option[]> = {
    name: string
    description?: string
    examples?: string[]
    options?: TOptionArray
    run?: (options: Arguments<TOptionArray>) => AsyncIterable<unknown> | Iterable<unknown> | unknown[] | void
}

export const defineCommand = <
    TOptionArray extends Option[]
>(command: Command<TOptionArray>): Command<TOptionArray> => command


export default Command
