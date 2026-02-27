import { defineCommand, defineOption, Program } from "cmdore"

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
        console.log(`Pushing with auth=${auth}`)
        if (force) {
            console.log("Force push enabled")
        }
    }
})

const status = defineCommand({
    name: "status",
    description: "Show repository status",
    run() {
        console.log("Status: clean")
    }
})

export const program = new Program({ colors: false })
program.intercept([tokenOption], async ({ token, ...rest }) => {
    return { ...rest, auth: token }
})
program.register(push).register(status)
