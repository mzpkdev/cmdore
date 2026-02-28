import { defineCommand, defineOption, Program, terminal } from "cmdore"

const tokenOption = defineOption({
    name: "token",
    required: true,
    description: "Authentication token",
    validate: (value) => value.toUpperCase()
})

const push = defineCommand({
    name: "push",
    description: "Push changes to remote",
    examples: ["--token abc123", "--token abc123 --force"],
    options: [
        tokenOption,
        defineOption({
            name: "force",
            arity: 0,
            description: "Force push"
        })
    ],
    run(argv) {
        const { auth, force } = argv as typeof argv & { auth: string }
        terminal.log(`Pushing with auth=${auth}`)
        if (force) {
            terminal.log("Force push enabled")
        }
        terminal.json({ action: "push", auth, force: !!force })
    }
})

const status = defineCommand({
    name: "status",
    description: "Show repository status",
    run() {
        terminal.log("Status: clean")
        terminal.json({ status: "clean" })
    }
})

export const program = new Program()
program.intercept([tokenOption], async ({ token, ...rest }) => {
    return { ...rest, auth: token }
})
program.register(push).register(status)
