import { defineCommand, effect, Program, terminal } from "cmdore"

const deploy = defineCommand({
    name: "deploy",
    description: "Deploy the application",
    examples: ["staging", "production --port 8080", "staging --dry-run"],
    arguments: [
        {
            name: "environment",
            required: true,
            description: "Target environment (staging, production)",
            validate: (value) => ["staging", "production"].includes(value)
        }
    ],
    options: [
        {
            name: "port",
            description: "Port number",
            defaultValue: () => 3000,
            validate: (value) => {
                const port = parseInt(value, 10)
                if (port <= 0) return false
                return port
            }
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

export const program = new Program().register(deploy)
