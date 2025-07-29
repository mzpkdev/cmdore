import Arguments from "@/Arguments"
import Option from "@/Option"


export type Command<TOptionArray extends Option[] = Option[]> = {
    name: string
    description?: string
    options?: TOptionArray
    runner?: (options: Arguments<TOptionArray>) => Iterable<void> | void
}

export const defineCommand = <
    TOptionArray extends Option[]
>(command: Command<TOptionArray>): Command<TOptionArray> => command


export default Command
