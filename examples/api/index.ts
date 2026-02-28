import { defineCommand, defineOption, Program, terminal } from "cmdore"

const list = defineCommand({
    name: "list",
    description: "List items",
    examples: ["--json", "--json --limit 5", "-l 2"],
    options: [
        defineOption({
            name: "limit",
            alias: "l",
            description: "Number of items to return",
            defaultValue: () => 3,
            validate: (value) => parseInt(value, 10)
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

export const program = new Program().register(list)
