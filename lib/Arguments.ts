import Option from "@/Option"


type Arguments<TOptionArray extends Option[] = Option[]> = {
    [TKey in TOptionArray[number] as TKey["name"]]: TKey extends Option<any, infer TValue>
        ? TValue
        : unknown
}

const re = /^--?([a-zA-Z0-9][\w-]*)$/

export const parseArgv = (argv: string[]) => {
    const operands: string[] = []
    const flags: Record<string, string[]> = {}
    let flag: string[] | null = null
    for (const argument of argv) {
        const match = re.exec(argument)
        if (match) {
            flag = []
            flags[match[1]] = flag
            continue
        }
        if (flag) {
            flag.push(argument)
            continue
        }
        operands.push(argument)
    }
    return { operands, flags }
}


export default Arguments
