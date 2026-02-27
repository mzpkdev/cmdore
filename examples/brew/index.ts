import { Program, defineCommand, defineOption, defineArgument } from "cmdore"

const make = defineCommand({
    name: "make",
    description: "Brew a coffee",
    arguments: [
        defineArgument({
            name: "type",
            required: true,
            description: "Coffee type (espresso, americano, latte, ...)",
        }),
    ],
    options: [
        defineOption({
            name: "size",
            alias: "s",
            description: "Cup size (small, medium, large)",
            defaultValue: () => "medium",
            parse: (value) => value,
        }),
    ],
    run({ type, size }) {
        console.log(`Brewing a ${size} ${type}...`)
        console.log("Done. Enjoy your coffee.")
    },
})

const program = new Program()
program.register(make)
program.execute(process.argv.slice(2))
