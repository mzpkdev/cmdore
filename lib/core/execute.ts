import argvex from "argvex"
import log, { bold, dim } from "logtint"
import { CmdoreError } from "../errors"
import { findMetadata, type Metadata } from "../metadata"
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
    metadata?: Metadata
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

const helpCommand = (command: Command, metadata: Metadata): void => {
    const { name, description } = metadata
    log``
    log`${bold(name)} - ${description}`
    log``
    log`${bold(dim`USAGE`)}`
    const argsSummary = (command.arguments ?? [])
        .map((arg: Argument) => {
            const label = arg.variadic ? `${arg.name}...` : arg.name
            return arg.required ? `<${label}>` : `[${label}]`
        })
        .join(" ")
    const usageParts = [name, command.name, argsSummary, "[options]"].filter(
        Boolean
    )
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
    const man: string[][] = (command.options ?? []).map((option: Option) => {
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
    })
    for (const [left, right] of man) {
        log`  ${left.padEnd(48, " ")}  ${right}`
    }
    const builtin = [
        ["    --quiet", "suppress any output"],
        ["    --verbose", "enable verbose output"],
        ["    --json", "enable JSON output"],
        ["    --dry-run", "simulate the command without executing anything"],
        ["    --no-colors", "disable colored output"],
        ["-v, --version", "show version"],
        ["-h, --help", "show information for program or the command"]
    ]
    for (const [left, right] of builtin) {
        log`  ${dim(left.padEnd(48, " "))}  ${dim(right)}`
    }
    if (command.examples) {
        log``
        log`${bold(dim`EXAMPLES`)}`
        for (const example of command.examples ?? []) {
            log`  $ ${name} ${command.name} ${dim(example)}`
        }
    }
    log``
}

const version = (metadata: Metadata): void => {
    log`v${metadata.version}`
}

export const execute = async (
    commands: readonly Command<any, any>[],
    config?: Configuration
): Promise<void> => {
    const {
        argv = process.argv.slice(2),
        metadata = findMetadata(),
        interceptors = [],
        onError = "exit"
    } = config ?? {}
    try {
        await run(commands, argv, metadata, interceptors)
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
    interceptors: readonly Interceptor[]
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
    const command = commands.find((command) => command.name === main)
    const options = command?.options ?? []
    const schema = [
        { name: "help", arity: 0, alias: "h" },
        { name: "version", arity: 0, alias: "v" },
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
    const { _: operands, ...flags } = argvex({
        argv,
        schema,
        strict: true,
        override: true
    })
    if (flags.help || main == null) {
        if (command == null) {
            help(commands, metadata)
        } else {
            helpCommand(command, metadata)
        }
        return
    }
    if (flags.version) {
        version(metadata)
        return
    }
    if (command == null) {
        throw new CmdoreError(`A command "${main}" does not exist.`, {
            code: "cmdore.unknownCommand"
        })
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
            const values: string[] | undefined =
                flags[option.alias ?? option.name] ?? flags[option.name]
            argv2[option.name] = await Option.parse(option, values)
        }
        const args = command.arguments ?? []
        const positionalOperands = operands.slice(1)
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
