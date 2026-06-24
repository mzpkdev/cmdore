import * as readline from "node:readline"
import log, { dim, red, yellow } from "logtint"

/**
 * The widest function shape the registry can store. `never[]` parameters make
 * every concrete function assignable to it, so wrappers and mocks of differing
 * signatures share one `Map`/`log` without resorting to `any`. Specific
 * signatures are recovered at the typed `effect.fn`/`effect.mock` boundaries.
 */
type AnyEffect = (...args: never[]) => unknown

/**
 * One recorded invocation of an `effect.fn` wrapper.
 *
 * @property wrapper - the wrapper reference that was called (the registry key)
 * @property label - display-only name, for dry-run/log output
 * @property args - the arguments the wrapper was called with
 */
type EffectRecord = {
    wrapper: AnyEffect
    label: string
    args: readonly unknown[]
}

const mocks = new Map<AnyEffect, AnyEffect>()

/**
 * The dry-run gate. `effect(callback)` runs `callback` only while
 * `effect.enabled` is `true`, returning its result (awaited); when disabled it
 * skips and resolves to `undefined`. `execute.ts` flips `effect.enabled` off
 * for `--dry-run`.
 *
 * Also a tiny effect registry: see {@link effect.fn} to wrap a write
 * side-effect that can be skipped on dry-run, substituted by a test, or
 * recorded with its arguments — keyed by the wrapper reference, never a name.
 */
export const effect = async (
    callback: () => Promise<unknown> | unknown
): Promise<unknown> => {
    if (effect.enabled) {
        return await callback()
    }
}
effect.enabled = true

/**
 * Every {@link effect.fn} invocation appended in order: `{ wrapper, label, args }`.
 * Cleared by {@link effect.reset}.
 */
effect.log = [] as EffectRecord[]

/**
 * Wrap a write side-effect so it can be gated, substituted, or recorded.
 *
 * Returns a callable with the SAME signature as `real`. On each call it
 * records `{ wrapper, label, args }` into {@link effect.log}, then:
 *   1. if a mock is registered for THIS wrapper reference → calls the mock and
 *      returns its result;
 *   2. else if dry-run (`!effect.enabled`) → skips and returns `undefined`;
 *   3. else → calls `real(...args)` and returns it.
 *
 * @param real - the function to wrap (sync or async)
 * @param label - display-only name for dry-run/log output; never the key.
 *   Defaults to `real.name || "anonymous"`.
 */
effect.fn = <TArgs extends unknown[], TReturn>(
    real: (...args: TArgs) => TReturn,
    label: string = real.name || "anonymous"
): ((...args: TArgs) => TReturn | undefined) => {
    const wrapper = (...args: TArgs): TReturn | undefined => {
        effect.log.push({ wrapper, label, args })
        const fake = mocks.get(wrapper)
        if (fake !== undefined) {
            return (fake as (...args: TArgs) => TReturn)(...args)
        }
        if (!effect.enabled) {
            return undefined
        }
        return real(...args)
    }
    return wrapper
}

/**
 * Register an override for an {@link effect.fn} wrapper, keyed by the wrapper
 * REFERENCE. While registered, calling the wrapper invokes `fake` (with the
 * same args) instead of the real function. `fake` must match `wrapper`'s
 * signature.
 */
effect.mock = <TFunction extends AnyEffect>(
    wrapper: TFunction,
    fake: TFunction
): void => {
    mocks.set(wrapper, fake)
}

/**
 * Remove the override for a single {@link effect.fn} wrapper, if any.
 */
effect.unmock = (wrapper: AnyEffect): void => {
    mocks.delete(wrapper)
}

/**
 * Clear ALL registry state: every mock and the {@link effect.log}, and restore
 * `effect.enabled` to `true`. Call between tests so nothing leaks.
 */
effect.reset = (): void => {
    mocks.clear()
    effect.log.length = 0
    effect.enabled = true
}

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
