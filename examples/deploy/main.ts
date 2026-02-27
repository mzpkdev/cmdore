import { program } from "./index"

async function main() {
    await program.execute()
}

main().catch(console.error.bind(console))
