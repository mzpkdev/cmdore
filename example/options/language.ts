import { defineOption } from "@/core/Option"


export default () => defineOption({
    name: "language",
    description: "Specifies the language code(s) for encoding",
    defaultValue: () => [ "und" ]
})
