import Program from "@/Program"
import encode from "./command/encode"


async function main() {
    const program = new Program()
    program
        .register(encode)
        .execute(process.argv.slice(2))
}


main()
    .catch((error) => console.log(error))
