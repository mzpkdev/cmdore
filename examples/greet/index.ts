import { defineCommand, execute, terminal } from "cmdore"

const greet = defineCommand({
    name: "greet",
    description: "Print a friendly greeting",
    arguments: [
        {
            name: "name",
            required: true
        }
    ],
    options: [
        {
            name: "loud",
            alias: "l",
            arity: 0,
            description: "Shout the greeting"
        }
    ],
    run({ name, loud }) {
        const greeting = `Hello, ${name}!`
        terminal.log(loud ? greeting.toUpperCase() : greeting)
    }
})

// Commandless CLI: a single command is passed to `execute` (not an array), so
// it is invoked as `greet <name> [options]` with no subcommand token. The
// metadata fixes the program name/description independently of the host
// package.json so the rendered help is stable.
export const program = (argv?: string[]): Promise<void> =>
    execute(greet, {
        argv,
        metadata: {
            name: "greet",
            version: "0.0.0",
            description: "Print a friendly greeting"
        }
    })
