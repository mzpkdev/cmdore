import { defineOption } from "@/Option"


export default () => defineOption({
    name: "language",
    description: "",
    defaultValue: () => [ "und" ]
})