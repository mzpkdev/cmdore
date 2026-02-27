import { defineCommand, defineOption, type Metadata, Program } from "cmdore"

const tokenOption = defineOption({
    name: "token",
    required: true,
    description: "Authentication token",
    parse: (value) => value.toUpperCase()
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
        const { auth, force } = argv as Record<string, unknown>
        console.log(`Pushing with auth=${auth}`)
        if (Array.isArray(force)) {
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

export const createProgram = (metadata?: Metadata) => {
    const program = new Program({ colors: false, metadata })
    program.intercept([tokenOption], async (argv) => {
        return {
            ...(argv as Record<string, unknown>),
            auth: (argv as Record<string, unknown>).token
        }
    })
    return program.register(push).register(status)
}

createProgram().execute()
