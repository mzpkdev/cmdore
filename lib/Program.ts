import mock from "@/mock"
import { UnexpectedError } from "@/errors"
import Command from "@/Command"
import Option from "@/Option"
import Arguments, { parseArgv } from "@/Arguments"


class Program {
    #_name: string
    #_description: string
    #_version: string
    #_commands = new Map<string, Command>()

    constructor() {
        const { name, description, version } = require("./package.json")
        this.#_name = name
        this.#_description = description
        this.#_version = version
    }

    register(command: Command): this {
        this.#_commands.set(command.name, command)
        return this
    }

    help(command?: Command): this {
        console.log(this.#_name, this.#_description)
        if (command == null) {
            for (const [ , command ] of this.#_commands) {
                console.log(command.name, command.description)
            }
            return this
        }
        for (const option of command.options ?? []) {
            console.log(option.name, option.description)
        }
        return this
    }

    version(): this {
        console.log(this.#_version)
        return this
    }

    async execute(argv: string[]): Promise<void> {
        const { operands, flags } = parseArgv(argv)
        const [ main ] = operands
        const command = this.#_commands.get(main)
        if (flags.help || flags.h) {
            this.help(command)
            return
        }
        if (flags.version || flags.v) {
            this.version()
            return
        }
        if (command == null) {
            throw new UnexpectedError(`A command "${main}" does not exist.`)
        }
        const accumulator: Arguments = {}
        for (const option of command.options ?? []) {
            const values: string[] | undefined = flags[option.alias ?? option.name] ?? flags[option.name]
            accumulator[option.name] = Option.parse(option, values)
        }
        const log = console.log.bind(console)
        const mocked = []
        if (!flags.verbose || flags.json) {
            mocked.push(
                mock(console, "debug"),
                mock(console, "info")
            )
        }
        if (flags.quiet || flags.q || flags.json) {
            mocked.push(
                mock(console, "log"),
                mock(console, "warn"),
                mock(console, "error")
            )
        }
        const output = command.runner?.(accumulator) ?? []
        for await (const entry of output) {
            if (flags.json) {
                log(entry)
            }
        }
        for (const unmock of mocked) {
            unmock()
        }
    }
}


export default Program
