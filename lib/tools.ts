import * as readline from "node:readline"
import log, { dim, red, yellow } from "logtint"

export const effect = async (
    callback: () => Promise<unknown> | unknown
): Promise<unknown> => {
    if (effect.enabled) {
        return await callback()
    }
}
effect.enabled = true

export const mock = <TInstance>(
    instance: TInstance,
    property: keyof TInstance
) => {
    const copy = instance[property]
    instance[property] = (() => {}) as typeof copy
    return () => {
        instance[property] = copy
    }
}

export const terminal = {
    colors: true,
    quiet: false,
    jsonMode: false,

    log: (message?: string): void => {
        if (terminal.quiet || terminal.jsonMode) return
        terminal.colors
            ? log(console.log)`${message}`
            : console.log(message ?? "")
    },
    json: (data: unknown): void => {
        if (!terminal.jsonMode) return
        process.stdout.write(`${JSON.stringify(data)}\n`)
    },
    verbose: (message?: string): void => {
        terminal.colors
            ? log(console.info)`${dim`${message}`}`
            : console.info(message ?? "")
    },
    warn: (message?: string): void => {
        if (terminal.quiet) return
        terminal.colors
            ? log(console.warn)`${yellow`${message}`}`
            : console.warn(message ?? "")
    },
    error: (message?: string): void => {
        terminal.colors
            ? log(console.error)`${red`${message}`}`
            : console.error(message ?? "")
    },
    prompt: async <TReturnValue = string>(
        message?: string,
        options?: {
            parser?: (value: string) => TReturnValue
            allowEmpty?: boolean
            validate?: (value: string) => boolean | string
        }
    ): Promise<TReturnValue> => {
        const { parser, allowEmpty = false, validate } = options ?? {}
        const ask = (): Promise<string> => {
            return new Promise((resolve) => {
                const line = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                })
                line.question(`${message ?? ""} `, (answer) => {
                    line.close()
                    resolve(answer)
                })
            })
        }

        while (true) {
            const answer = await ask()
            if (answer === "" && !allowEmpty) continue
            if (validate) {
                const result = validate(answer)
                if (result === false) continue
                if (typeof result === "string") {
                    terminal.warn(result)
                    continue
                }
            }
            return parser?.(answer) ?? (answer as TReturnValue)
        }
    }
}
