import { defineOption } from "@/core/Option"


export default defineOption({
    name: "output",
    alias: "o",
    description: "Specifies the output file or directory path",
    required: true
})
