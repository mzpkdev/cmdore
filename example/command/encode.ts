import { defineCommand } from "@/Command"

import input from "../options/input"
import output from "../options/output"
import language from "../options/language"


export default defineCommand({
    name: "encode",
    description: "",
    options: [
        input,
        output,
        language()
    ],
    runner: function ({ input, output }) {
        void input
        void output
    }
})
