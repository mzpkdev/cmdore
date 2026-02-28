import * as readline from "node:readline"
import log, { dim, red, reset, yellow } from "logtint"

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

export const colorConsoleLog = (): void => {
    const original = {
        debug: console.debug.bind(console),
        info: console.info.bind(console),
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
    }

    console.debug = (...messages: string[]): void => {
        betterLog(messages, original.debug, dim)
    }

    console.info = (...messages: string[]): void => {
        betterLog(messages, original.info, reset)
    }

    console.log = (...messages: unknown[]): void => {
        betterLog(messages, original.log, reset)
    }

    console.warn = (...messages: string[]): void => {
        betterLog(messages, original.warn, yellow)
    }

    console.error = (...messages: string[]): void => {
        betterLog(messages, original.error, red)
    }
}

const betterLog = (
    messages: unknown[],
    originalLog: typeof console.log,
    color: typeof reset
) => {
    for (const message of messages) {
        if (typeof message === "string") {
            log(originalLog)`${color`${message}`}`
        } else {
            console.dir(message)
        }
    }
}

// TODO: Remove?
export const terminal = {
    verbose: (message?: string): void => {
        log(console.info)`${dim`${message}`}`
    },
    warn: (message?: string): void => {
        log(console.warn)`${yellow`${message}`}`
    },
    error: (message?: string): void => {
        log(console.error)`${red`${message}`}`
    },
    print: (message?: string): void => {
        log(console.log)`${message}`
    },
    prompt: async function prompt<TReturnValue = string>(
        message?: string,
        parser?: (value: string) => TReturnValue
    ): Promise<TReturnValue> {
        return new Promise<TReturnValue>((resolve) => {
            const { stdin, stdout } = process
            const line = readline.createInterface({
                input: stdin,
                output: stdout
            })
            line.question(`${message ?? ""} `, (answer) => {
                line.close()
                if (answer === "") {
                    resolve(prompt(message, parser))
                    return
                }
                resolve(parser?.(answer) ?? (answer as TReturnValue))
            })
        })
    }
}
