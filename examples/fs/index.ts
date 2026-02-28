import { defineCommand, Program } from "cmdore"

const copy = defineCommand({
    name: "copy",
    description: "Copy files to a destination",
    examples: ["dist/ src/a.ts src/b.ts", "out/ main.ts"],
    arguments: [
        {
            name: "destination",
            required: true,
            description: "Target directory"
        },
        {
            name: "files",
            variadic: true,
            description: "Files to copy"
        }
    ],
    run({ destination, files }) {
        console.log(`Copying ${files.join(", ")} to ${destination}`)
    }
})

const remove = defineCommand({
    name: "remove",
    description: "Remove files",
    examples: ["a.ts b.ts --confirm"],
    arguments: [
        {
            name: "files",
            variadic: true,
            required: true,
            description: "Files to remove"
        }
    ],
    options: [
        {
            name: "confirm",
            arity: 0,
            required: true,
            description: "Confirm removal"
        }
    ],
    run({ files }) {
        console.log(`Removing ${files.join(", ")}`)
    }
})

export const program = new Program().register(copy).register(remove)
