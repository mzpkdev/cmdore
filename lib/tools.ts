import * as readline from "readline"
import log, { dim, red, yellow } from "logtint"

export const effect = async (callback: () => Promise<unknown> | unknown): Promise<unknown> => {
    if (effect.enabled) {
        return await callback()
    }
}
effect.enabled = true

export const mock = <TInstance>(instance: TInstance, property: keyof TInstance) => {
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
        error: console.error.bind(console),
    }

    console.debug = (message?: string): void => {
        log(original.debug)`${dim`${message}`}`
    }

    console.info = (message?: string): void => {
        log(original.info)`${message}`
    }

    console.log = (message?: string): void => {
        log(original.log)`${message}`
    }

    console.warn = (message?: string): void => {
        log(original.warn)`${yellow`${message}`}`
    }

    console.error = (message?: string): void => {
        log(original.error)`${red`${message}`}`
    }
}

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
    prompt: async function prompt<TReturnValue = string>(message?: string, parser?: (value: string) => TReturnValue): Promise<TReturnValue> {
        return new Promise<TReturnValue>((resolve) => {
            const { stdin, stdout } = process
            const line = readline.createInterface({ input: stdin, output: stdout })
            line.question(`${message ?? ""} `, (answer) => {
                line.close()
                if (answer == "") {
                    resolve(prompt(message, parser))
                }
                resolve(parser?.(answer) ?? answer as TReturnValue)
            });
        });
    }
}
