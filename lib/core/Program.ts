import * as path from "node:path"
import argvex from "argvex"
import log, { bold, dim } from "logtint"
import { CmdoreError } from "../errors"
import Command, { Arguments } from "./Command"
import Option from "./Option"
import { effect, mock } from "../tools"


class Program {
    #_name: string = ""
    #_description: string = ""
    #_version: string = ""
    #_commands = new Map<string, Command>()
    #_interceptors = new Set<
        [ (argument: Arguments) => Promise<Arguments | void>, Option[] ]
    >()

    constructor() {
        const { name, description, version } = require(path.join(process.cwd(), "./package.json"))
        this.#_name = name
        this.#_description = description
        this.#_version = version
    }

    intercept<TOptionsTOptionArray extends Option[] = Option<string, any>[]>(
        dependencies: TOptionsTOptionArray,
        interceptor: (argument: Arguments<TOptionsTOptionArray>) => Promise<Arguments | void>
    ): this {
        this.#_interceptors.add([ interceptor, dependencies ])
        return this
    }

    register(command: Command): this {
        this.#_commands.set(command.name, command)
        return this
    }

    help(command?: Command): this {
        log``
        log`${bold(this.#_name)} - ${this.#_description}`
        log``
        if (command == null) {
            log`${bold(dim`USAGE`)}`
            log`  ${this.#_name} <command> [options]`
            log``
            log`${bold(dim`COMMANDS`)}`
            const man: readonly [ string, string ][] = Array.from(this.#_commands.values())
                .map(command => ([ command.name, command.description ?? "" ] as const))
            for (const [ left, right ] of man) {
                log`  ${left.padEnd(48, " ")}  ${right}`
            }
            return this
        }
        log`${bold(dim`USAGE`)}`
        log`  ${this.#_name} ${command.name} [options]`
        log``
        log`${bold(dim`OPTIONS`)}`
        const man: string[][] = (command.options ?? [])
            .map(option => {
                const left = option.alias
                    ? `-${option.alias}, --${option.name}` : `--${option.name}`.padStart(4, " ")
                return [ left, option.description ?? "" ]
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
                log`  $ ${this.#_name} ${command.name} ${dim(example)}`
            }
        }
        return this
    }

    version(): this {
        log`v${this.#_version}`
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
            ...options.map(({ name, alias }) => (
                { name, alias, arity: Infinity }
            ))
        ]
        const { _: operands, ...flags } = argvex({ argv, schema, strict: true })
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
        let accumulator: Arguments = {}
        for (const option of command.options ?? []) {
            const values: string[] | undefined = flags[option.alias ?? option.name] ?? flags[option.name]
            accumulator[option.name] = await Option.parse(option, values)
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
            if (dependencies.every(dependency => dependency.name in accumulator)) {
                accumulator = await interceptor(accumulator) ?? accumulator
            }
        }
        const output = command.run?.(accumulator) ?? []
        if (output) {
            for await (const entry of output) {
                if (flags.json) {
                    log(entry)
                }
            }
        }
        for (const unmock of mocked) {
            unmock()
        }
    }
}


export default Program
