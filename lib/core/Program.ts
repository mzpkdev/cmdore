import argvex from "argvex"
import log, { bold, dim } from "logtint"
import { CmdoreError } from "../errors"
import { findMetadata, type Metadata } from "../metadata"
import { effect, mock, terminal } from "../tools"

import Argument from "./Argument"
import type Command from "./Command"
import type { Argv } from "./Command"
import Option from "./Option"

export type Configuration = {
    metadata?: Metadata
}

class Program {
    #_metadata: Metadata | undefined
    #_commands = new Map<string, Command<any, any>>()
    #_interceptors = new Set<
        [(argv: Argv) => Promise<void> | void, readonly Option[]]
    >()
    get metadata(): Metadata {
        if (this.#_metadata == null) {
            this.#_metadata = findMetadata()
        }
        return this.#_metadata
    }

    constructor(configuration?: Configuration) {
        const { metadata } = configuration ?? {}
        if (metadata) {
            this.#_metadata = metadata
        }
    }

    intercept<
        TOptionArray extends readonly Option[] = readonly Option<string, any>[]
    >(
        dependencies: TOptionArray,
        interceptor: (argv: Argv<TOptionArray>) => Promise<void> | void
    ): this {
        this.#_interceptors.add([
            interceptor as (argv: Argv) => Promise<void> | void,
            dependencies
        ])
        return this
    }

    register<
        const TOptionArray extends readonly Option<string, any>[],
        const TArgumentArray extends readonly Argument<string, any>[]
    >(command: Command<TOptionArray, TArgumentArray>): this {
        const args = command.arguments ?? []
        for (let i = 0; i < args.length; i++) {
            if (args[i].variadic && i !== args.length - 1) {
                throw new CmdoreError(
                    `A variadic argument "${args[i].name}" must be the last argument.`
                )
            }
        }
        this.#_commands.set(command.name, command)
        return this
    }

    help(command?: Command<any, any>): this {
        const { name, description } = this.metadata
        log``
        log`${bold(name)} - ${description}`
        log``
        if (command == null) {
            log`${bold(dim`USAGE`)}`
            log`  ${name} <command> [options]`
            log``
            log`${bold(dim`COMMANDS`)}`
            const man: readonly [string, string][] = Array.from(
                this.#_commands.values()
            ).map(
                (command) => [command.name, command.description ?? ""] as const
            )
            for (const [left, right] of man) {
                log`  ${left.padEnd(48, " ")}  ${right}`
            }
            log``
            return this
        }
        log`${bold(dim`USAGE`)}`
        const argsSummary = (command.arguments ?? [])
            .map((arg: Argument) => {
                const label = arg.variadic ? `${arg.name}...` : arg.name
                return arg.required ? `<${label}>` : `[${label}]`
            })
            .join(" ")
        const usageParts = [
            name,
            command.name,
            argsSummary,
            "[options]"
        ].filter(Boolean)
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
        const man: string[][] = (command.options ?? []).map(
            (option: Option) => {
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
        const builtin = [
            ["    --quiet", "suppress any output"],
            ["    --verbose", "enable verbose output"],
            ["    --json", "enable JSON output"],
            [
                "    --dry-run",
                "simulate the command without executing anything"
            ],
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
        return this
    }

    version(): this {
        const { version } = this.metadata
        log`v${version}`
        return this
    }

    async execute(argv: string[] = process.argv.slice(2)): Promise<void> {
        const [main] = argv
        const command = this.#_commands.get(main)
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
            this.help(command)
            return
        }
        if (flags.version) {
            this.version()
            return
        }
        if (command == null) {
            throw new CmdoreError(`A command "${main}" does not exist.`)
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
            const argv2: Argv = {}
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
            for (const [interceptor, dependencies] of this.#_interceptors) {
                if (
                    dependencies.every((dependency) => dependency.name in argv2)
                ) {
                    await interceptor(argv2)
                }
            }
            await command.run?.(argv2)
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
}

export default Program
