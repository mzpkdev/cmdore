import pkg, { Metadata } from "pkginspect"
import log, { bold, dim } from "logtint"
import argvex from "argvex"
import { CmdoreError } from "../errors"
import { isAsyncIterable, isIterable } from "../utils"
import { colorConsoleLog, effect, mock } from "../tools"
import Option from "./Option"
import Argument from "./Argument"
import Command, { Argv } from "./Command"


export type Configuration = {
    colors: boolean
}

class Program {
    #_metadata: Metadata | undefined
    #_commands = new Map<string, Command>()
    #_interceptors = new Set<
        [ (argv: Argv) => Promise<Argv | void>, Option[] ]
    >()

    get metadata(): Metadata {
        if (this.#_metadata == null) {
            const self = pkg.inspect()
            this.#_metadata = self.root.metadata
        }
        return this.#_metadata
    }

    constructor(configuration?: Configuration) {
        const { colors = true } = configuration ?? {}
        if (colors) {
            colorConsoleLog()
        }
    }

    intercept<TOptionArray extends Option[] = Option<string, any>[]>(
        dependencies: TOptionArray,
        interceptor: (argv: Argv<TOptionArray>) => Promise<Argv | void>
    ): this {
        this.#_interceptors.add([ interceptor, dependencies ])
        return this
    }

    register<TOptionArray extends Option[], TArgumentArray extends Argument[]>(command: Command<TOptionArray, TArgumentArray>): this {
        const args = command.arguments ?? []
        for (let i = 0; i < args.length; i++) {
            if (args[i].variadic && i !== args.length - 1) {
                throw new CmdoreError(`A variadic argument "${args[i].name}" must be the last argument.`)
            }
        }
        this.#_commands.set(command.name, command as any)
        return this
    }

    help(command?: Command): this {
        const { name, description } = this.metadata
        log``
        log`${bold(name)} - ${description}`
        log``
        if (command == null) {
            log`${bold(dim`USAGE`)}`
            log`  ${name} <command> [options]`
            log``
            log`${bold(dim`COMMANDS`)}`
            const man: readonly [ string, string ][] = Array.from(this.#_commands.values())
                .map(command => ([ command.name, command.description ?? "" ] as const))
            for (const [ left, right ] of man) {
                log`  ${left.padEnd(48, " ")}  ${right}`
            }
            log``
            return this
        }
        log`${bold(dim`USAGE`)}`
        const argsSummary = (command.arguments ?? [])
            .map(arg => {
                const label = arg.variadic ? `${arg.name}...` : arg.name
                return arg.required ? `<${label}>` : `[${label}]`
            })
            .join(" ")
        const usageParts = [name, command.name, argsSummary, "[options]"].filter(Boolean)
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
                const right = arg.description ? `${arg.description} ${info}`.trim() : info
                log`  ${left.padEnd(48, " ")}  ${right}`
            }
            log``
        }
        log`${bold(dim`OPTIONS`)}`
        const man: string[][] = (command.options ?? [])
            .map(option => {
                const flags = option.alias
                    ? `-${option.alias}, --${option.name}` : `--${option.name}`.padStart(4, " ")
                const args = ""
                let info = ""
                if (option.required) {
                    info = "(required)"
                }
                if (option.defaultValue) {
                    const defaultValue = option.defaultValue()
                    info = `(${JSON.stringify(defaultValue)})`
                }
                const left = `${flags}\t${args}`
                const right = `${option.description} (${info})`
                return [ left, right ]
            })
        for (const [ left, right ] of man) {
            log`  ${left.padEnd(48, " ")}  ${right}`
        }
        const builtin = [
            [ "    --quiet", "suppress any output" ],
            [ "    --verbose", "enable verbose output" ],
            [ "    --json", "enable JSON output" ],
            [ "    --dry-run", "simulate the command without executing anything" ],
            [ "-v, --version", "show version" ],
            [ "-h, --help", "show information for program or the command" ],
        ]
        for (const [ left, right ] of builtin) {
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

    async execute(argv: string[]): Promise<void> {
        const [ main ] = argv
        const command = this.#_commands.get(main)
        const options = command?.options ?? []
        const schema = [
            { name: "help", arity: 0, alias: "h" },
            { name: "version", arity: 0, alias: "v" },
            { name: "verbose", arity: 0 },
            { name: "quiet", arity: 0 },
            { name: "json", arity: 0 },
            { name: "dry-run", arity: 0 },
            ...options.map(({ name, alias, arity }) => (
                { name, alias, arity: arity ?? Infinity }
            ))
        ]
        const { _: operands, ...flags } = argvex({ argv, schema, strict: true, override: true })
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
        if (flags["dry-run"]) {
            effect.enabled = false
        }
        let argv2: Argv = {}
        for (const option of command.options ?? []) {
            const values: string[] | undefined = flags[option.alias ?? option.name] ?? flags[option.name]
            argv2[option.name] = await Option.parse(option, values)
        }
        const args = command.arguments ?? []
        const positionalOperands = operands.slice(1)
        for (let i = 0; i < args.length; i++) {
            const argument = args[i]
            if (argument.variadic) {
                argv2[argument.name] = await Argument.parseVariadic(argument, positionalOperands.slice(i))
            } else {
                argv2[argument.name] = await Argument.parse(argument, positionalOperands[i])
            }
        }
        const log = console.log.bind(console)
        const mocked = []
        if (!flags.verbose || flags.json) {
            mocked.push(
                mock(console, "debug"),
                mock(console, "info")
            )
        }
        if (flags.quiet || flags.json) {
            mocked.push(
                mock(console, "log"),
                mock(console, "warn"),
                mock(console, "error")
            )
        }
        for (const [ interceptor, dependencies ] of this.#_interceptors) {
            if (dependencies.every(dependency => dependency.name in argv2)) {
                argv2 = await interceptor(argv2) ?? argv2
            }
        }
        const output = await command.run?.(argv2)
        if (isIterable(output) || isAsyncIterable(output)) {
            for await (const entry of output) {
                if (flags.json) {
                    log(JSON.stringify(entry, null, 2))
                }
            }
        }
        for (const unmock of mocked) {
            unmock()
        }
    }
}


export default Program
