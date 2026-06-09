import {
    defineCommand,
    effect,
    execute,
    type StandardSchemaV1,
    terminal
} from "cmdore"

const environmentSchema: StandardSchemaV1<"staging" | "production"> = {
    "~standard": {
        version: 1,
        vendor: "deploy-example",
        validate: (value) =>
            value === "staging" || value === "production"
                ? { value }
                : { issues: [{ message: `Invalid environment "${value}".` }] }
    }
}

const portSchema: StandardSchemaV1<number> = {
    "~standard": {
        version: 1,
        vendor: "deploy-example",
        validate: (value) => {
            const port = parseInt(String(value), 10)
            if (Number.isNaN(port) || port <= 0) {
                return { issues: [{ message: `Invalid port "${value}".` }] }
            }
            return { value: port }
        }
    }
}

const deploy = defineCommand({
    name: "deploy",
    description: "Deploy the application",
    examples: ["staging", "production --port 8080", "staging --dry-run"],
    arguments: [
        {
            name: "environment",
            required: true,
            description: "Target environment (staging, production)",
            schema: environmentSchema
        }
    ],
    options: [
        {
            name: "port",
            arity: 1,
            description: "Port number",
            defaultValue: () => 3000,
            schema: portSchema
        }
    ],
    run({ environment, port }) {
        terminal.log(`Deploying to ${environment} on port ${port}...`)
        terminal.json({ environment, port, status: "deploying" })
        effect(() => {
            terminal.log(`Deployment to ${environment} complete.`)
            terminal.json({ environment, port, status: "complete" })
        })
    }
})

export const program = (argv?: string[]): Promise<void> =>
    execute([deploy], { argv })
