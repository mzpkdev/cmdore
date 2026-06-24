import argvex from "argvex"
import log, { bold, dim } from "logtint"
import { CmdoreError } from "../errors"
import type { Metadata } from "../metadata"
import { effect, mock, terminal } from "../tools"

import Argument from "./Argument"
import type Command from "./Command"
import type { Argv } from "./Command"
import Option from "./Option"

export type Interceptor = {
    dependencies: readonly Option[]
    handler: (argv: Argv) => void | Promise<void>
}

export const intercept = <const TOptions extends readonly Option[]>(
    dependencies: TOptions,
    handler: (argv: Argv<TOptions>) => void | Promise<void>
): Interceptor => ({
    dependencies,
    handler: handler as (argv: Argv) => void | Promise<void>
})

export type Configuration = {
    argv?: string[]
    metadata: Metadata
    interceptors?: Interceptor[]
    onError?: "exit" | "throw"
}

const help = (
    commands: readonly Command<any, any>[],
    metadata: Metadata
): void => {
    const { name, description } = metadata
    log``
    log`${bold(name)} - ${description}`
    log``
    log`${bold(dim`USAGE`)}`
    log`  ${name} <command> [options]`
    log``
    log`${bold(dim`COMMANDS`)}`
    const man: readonly [string, string][] = commands.map(
        (command) => [command.name, command.description ?? ""] as const
    )
    for (const [left, right] of man) {
        log`  ${left.padEnd(48, " ")}  ${right}`
    }
    log``
}

const helpCommand = (
    command: Command,
    metadata: Metadata,
    opts?: { commandless?: boolean }
): void => {
    const { name } = metadata
    const title = opts?.commandless ? name : `${name} ${command.name}`
    log``
    log`${bold(title)} - ${command.description ?? ""}`
    log``
    log`${bold(dim`USAGE`)}`
    const argsSummary = (command.arguments ?? [])
        .map((arg: Argument) => {
            const label = arg.variadic ? `${arg.name}...` : arg.name
            return arg.required ? `<${label}>` : `[${label}]`
        })
        .join(" ")
    const usageParts = (
        opts?.commandless
            ? [name, argsSummary, "[options]"]
            : [name, command.name, argsSummary, "[options]"]
    ).filter(Boolean)
    log`  ${usageParts.join(" ")}`
    log``
    if (command.arguments?.length) {
        log`${bold(dim`ARGUMENTS`)}`
        for (const arg of command.arguments) {
            const label = arg.variadic ? `${arg.name}...` : arg.name
            const left = arg.required ? `<${label}>` : `[${label}]`
            let info = ""
            if (arg.required) {
                info = "(required)"
            }
            if (arg.defaultValue) {
                const defaultValue = arg.defaultValue()
                info = `(${JSON.stringify(defaultValue)})`
            }
            const right = arg.description
                ? `${arg.description} ${info}`.trim()
                : info
            log`  ${left.padEnd(48, " ")}  ${right}`
        }
        log``
    }
    log`${bold(dim`OPTIONS`)}`
    const man: [string, string][] = (command.options ?? []).map(
        (option: Option): [string, string] => {
            const flags = option.alias
                ? `-${option.alias}, --${option.name}`
                : `--${option.name}`.padStart(4, " ")
            const args = option.hint ? ` <${option.hint}>` : ""
            let info = ""
            if (option.required) {
                info = "(required)"
            }
            if (option.defaultValue) {
                const defaultValue = option.defaultValue()
                info = `(${JSON.stringify(defaultValue)})`
            }
            const left = `${flags}${args}`
            const right = option.description
                ? `${option.description} ${info}`.trim()
                : info
            return [left, right]
        }
    )
    for (const [left, right] of man) {
        log`  ${left.padEnd(48, " ")}  ${right}`
    }
    const builtin: [string, string][] = [
        ["    --quiet", "suppress any output"],
        ["    --verbose", "enable verbose output"],
        ["    --json", "enable JSON output"],
        ["    --dry-run", "simulate the command without executing anything"],
        ["    --no-colors", "disable colored output"],
        ...(metadata.version != null
            ? ([["-v, --version", "show version"]] as [string, string][])
            : []),
        ["-h, --help", "show information for program or the command"]
    ]
    for (const [left, right] of builtin) {
        log`  ${dim(left.padEnd(48, " "))}  ${dim(right)}`
    }
    if (command.examples) {
        log``
        log`${bold(dim`EXAMPLES`)}`
        for (const example of command.examples ?? []) {
            const prefix = opts?.commandless ? name : `${name} ${command.name}`
            log`  $ ${prefix} ${dim(example)}`
        }
    }
    log``
}

const version = (value: string): void => {
    log`v${value}`
}

type Execute = {
    (command: Command<any, any>, config: Configuration): Promise<void>
    (
        commands: readonly Command<any, any>[],
        config: Configuration
    ): Promise<void>
}

export const execute: Execute = async (
    input: Command<any, any> | readonly Command<any, any>[],
    config: Configuration
): Promise<void> => {
    const {
        argv = process.argv.slice(2),
        metadata,
        interceptors = [],
        onError = "exit"
    } = config
    const commandless = !Array.isArray(input)
    const commands: readonly Command<any, any>[] = commandless ? [input] : input
    try {
        await run(commands, argv, metadata, interceptors, commandless)
    } catch (error) {
        if (onError === "throw") {
            throw error
        }
        terminal.error(error instanceof Error ? error.message : String(error))
        if (
            argv.includes("--verbose") &&
            error instanceof Error &&
            error.stack
        ) {
            terminal.verbose(error.stack)
        }
        process.exitCode = error instanceof CmdoreError ? error.exitCode : 1
    }
}

const run = async (
    commands: readonly Command<any, any>[],
    argv: string[],
    metadata: Metadata,
    interceptors: readonly Interceptor[],
    commandless: boolean
): Promise<void> => {
    for (const command of commands) {
        const args = command.arguments ?? []
        for (let i = 0; i < args.length; i++) {
            if (args[i].variadic && i !== args.length - 1) {
                throw new CmdoreError(
                    `A variadic argument "${args[i].name}" must be the last argument.`,
                    { code: "cmdore.invalidArgument" }
                )
            }
        }
    }
    const [main] = argv
    const command = commandless
        ? commands[0]
        : commands.find((command) => command.name === main)
    const options = command?.options ?? []
    const hasVersion = metadata.version != null
    const schema = [
        { name: "help", arity: 0, alias: "h" },
        ...(hasVersion ? [{ name: "version", arity: 0, alias: "v" }] : []),
        { name: "verbose", arity: 0 },
        { name: "quiet", arity: 0 },
        { name: "json", arity: 0 },
        { name: "dry-run", arity: 0 },
        { name: "no-colors", arity: 0 },
        ...options.map(({ name, alias, arity }: Option) => ({
            name,
            alias,
            arity: arity ?? Infinity
        }))
    ]
    // Reject genuinely-undefined flags before parsing. argvex is left in strict
    // mode below as a backstop, but doing the check here lets us surface a typed
    // CmdoreError (code cmdore.unknownFlag) with a clear message instead of
    // leaking argvex's generic "unrecognized or misplaced" text. Known tokens
    // are the global flags plus every per-command option name and alias.
    const known = new Set<string>()
    for (const { name, alias } of schema) {
        known.add(name)
        if (alias != null) {
            known.add(alias)
        }
    }
    for (const arg of argv) {
        // Everything after "--" is an operand, never a flag.
        if (arg === "--") {
            break
        }
        if (arg.startsWith("--")) {
            const eq = arg.indexOf("=", 2)
            const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq)
            if (name.length > 0 && !known.has(name)) {
                throw new CmdoreError(`An option "--${name}" is unknown.`, {
                    code: "cmdore.unknownFlag",
                    exitCode: 2
                })
            }
        } else if (arg.startsWith("-") && arg.length > 1) {
            // Short flags may be grouped (e.g. -abc); every alias must be known.
            for (const alias of arg.slice(1)) {
                if (!known.has(alias)) {
                    throw new CmdoreError(`An option "-${alias}" is unknown.`, {
                        code: "cmdore.unknownFlag",
                        exitCode: 2
                    })
                }
            }
        }
    }
    const { _: operands, ...flags } = argvex({
        argv,
        schema,
        strict: true,
        override: true
    })
    // Second parse with override:false so a repeated variadic option
    // accumulates its values across occurrences (--x a --x b -> [a, b]) instead
    // of last-wins. Only variadic options read from this result; single-value
    // (arity 1) and boolean (arity 0) options keep their last-wins semantics
    // from the override:true parse above, and operands also come from there
    // (override:false would mis-detach trailing values of repeated arity-1
    // flags into the operand list).
    const accumulated = argvex({
        argv,
        schema,
        strict: true,
        override: false
    })
    if (flags.help || (!commandless && main == null)) {
        if (command == null) {
            help(commands, metadata)
        } else {
            helpCommand(command, metadata, { commandless })
        }
        return
    }
    if (flags.version && metadata.version != null) {
        version(metadata.version)
        return
    }
    if (!commandless && command == null) {
        throw new CmdoreError(`A command "${main}" does not exist.`, {
            code: "cmdore.unknownCommand",
            exitCode: 2
        })
    }
    // Invariant: by this point `command` is always resolved. In commandless mode
    // it is `commands[0]`; otherwise the guard above has thrown for a missing
    // command. This narrows the `| undefined` that `.find()` leaks into the type.
    if (command == null) {
        return
    }
    const previousEffectEnabled = effect.enabled
    const previousColors = terminal.colors
    const previousQuiet = terminal.quiet
    const previousJsonMode = terminal.jsonMode
    const mocked: (() => void)[] = []
    try {
        if (flags["no-colors"]) {
            terminal.colors = false
        }
        if (flags.quiet) {
            terminal.quiet = true
        }
        if (flags.json) {
            terminal.jsonMode = true
        }
        if (flags["dry-run"]) {
            effect.enabled = false
        }
        const argv2: Record<string, unknown> = {}
        for (const option of command.options ?? []) {
            // A variadic option (arity unset or anything other than 0/1) reads
            // its accumulated values so repeated occurrences merge; arity 0/1
            // options keep last-wins from the primary (override:true) parse.
            const arity = option.arity ?? Infinity
            const source = arity === 0 || arity === 1 ? flags : accumulated
            const values: string[] | undefined =
                source[option.alias ?? option.name] ?? source[option.name]
            argv2[option.name] = await Option.parse(option, values)
        }
        const args = command.arguments ?? []
        const positionalOperands = commandless ? operands : operands.slice(1)
        for (let i = 0; i < args.length; i++) {
            const argument = args[i]
            if (argument.variadic) {
                argv2[argument.name] = await Argument.parseVariadic(
                    argument,
                    positionalOperands.slice(i)
                )
            } else {
                argv2[argument.name] = await Argument.parse(
                    argument,
                    positionalOperands[i]
                )
            }
        }
        if (!flags.verbose || flags.json) {
            mocked.push(mock(console, "debug"), mock(console, "info"))
        }
        if (flags.quiet || flags.json) {
            mocked.push(
                mock(console, "log"),
                mock(console, "warn"),
                mock(console, "error")
            )
        }
        for (const { handler, dependencies } of interceptors) {
            if (dependencies.every((dependency) => dependency.name in argv2)) {
                await handler(argv2 as Argv)
            }
        }
        if (!command.run) {
            throw new CmdoreError(
                `Command "${command.name}" has no run handler.`,
                {
                    code: "cmdore.missingRunHandler"
                }
            )
        }
        await command.run(argv2 as Argv)
    } finally {
        effect.enabled = previousEffectEnabled
        terminal.colors = previousColors
        terminal.quiet = previousQuiet
        terminal.jsonMode = previousJsonMode
        for (const unmock of mocked) {
            unmock()
        }
    }
}
