import { defineCommand, defineOption, Program } from "cmdore"

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
            parse: (value) => parseInt(value, 10)
        })
    ],
    async *run({ limit }) {
        for (let i = 1; i <= (limit as number); i++) {
            const item = { id: i, name: `item-${i}` }
            console.log(`id=${item.id} name=${item.name}`)
            yield item
        }
    }
})

export const createProgram = () => new Program({ colors: false }).register(list)

createProgram().execute()
