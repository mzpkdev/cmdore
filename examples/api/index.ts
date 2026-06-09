import {
    defineCommand,
    defineOption,
    execute,
    type StandardSchemaV1,
    terminal
} from "cmdore"

const numberSchema: StandardSchemaV1<number> = {
    "~standard": {
        version: 1,
        vendor: "api-example",
        validate: (value) => {
            const n = Number(value)
            return Number.isNaN(n)
                ? { issues: [{ message: `"${value}" is not a number.` }] }
                : { value: n }
        }
    }
}

const list = defineCommand({
    name: "list",
    description: "List items",
    examples: ["--json", "--json --limit 5", "-l 2"],
    options: [
        defineOption({
            name: "limit",
            alias: "l",
            arity: 1,
            description: "Number of items to return",
            defaultValue: () => 3,
            schema: numberSchema
        })
    ],
    run({ limit }) {
        for (let i = 1; i <= limit; i++) {
            const item = { id: i, name: `item-${i}` }
            terminal.log(`id=${item.id} name=${item.name}`)
            terminal.json(item)
        }
    }
})

export const program = (argv?: string[]): Promise<void> =>
    execute([list], { argv })
