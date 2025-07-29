import { defineCommand } from "@/core/Command"

import input from "../options/input"
import output from "../options/output"
import language from "../options/language"


export default defineCommand({
    name: "encode",
    description: "Encodes input data to the specified output format",
    options: [
        input,
        output,
        language()
    ],
    run: function ({ input, output }) {
        void input
        void output
        console.log(input, output)
    }
})
