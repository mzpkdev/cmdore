import { program } from "./index"

async function main() {
    await program()
}

main().catch(console.error.bind(console))
