import {
    defineCommand,
    defineOption,
    execute,
    intercept,
    type StandardSchemaV1,
    terminal
} from "cmdore"

const upperCaseSchema: StandardSchemaV1<string> = {
    "~standard": {
        version: 1,
        vendor: "git-example",
        validate: (value) => ({ value: String(value).toUpperCase() })
    }
}

const tokenOption = defineOption({
    name: "token",
    required: true,
    arity: 1,
    description: "Authentication token",
    schema: upperCaseSchema
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
        const { token, force } = argv
        terminal.log(`Pushing with token=${token}`)
        if (force) {
            terminal.log("Force push enabled")
        }
        terminal.json({ action: "push", token, force: !!force })
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

export const program = (argv?: string[]): Promise<void> =>
    execute([push, status], {
        argv,
        interceptors: [
            intercept([tokenOption], () => {
                terminal.log("Authenticating...")
            })
        ]
    })
