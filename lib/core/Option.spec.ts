import { describe, expect, it } from "vitest"
import Option, { defineOption } from "./Option"

describe("Option.parse", () => {
    describe("when values are undefined", () => {
        it("should throw when option is required", async () => {
            const option = { name: "host", required: true }
            await expect(Option.parse(option, undefined)).rejects.toThrowError(
                `An option "host" is required.`
            )
        })

        it("should return undefined when not required and no default", async () => {
            const option = { name: "host" }
            const result = await Option.parse(option, undefined)
            expect(result).toStrictEqual(undefined)
        })

        it("should return the defaultValue result", async () => {
            const option = { name: "host", defaultValue: () => "localhost" }
            const result = await Option.parse(option, undefined)
            expect(result).toStrictEqual("localhost")
        })
    })

    describe("when values are provided", () => {
        it("should return raw values when no parse function exists", async () => {
            const option = { name: "host" }
            const result = await Option.parse(option, ["localhost"])
            expect(result).toStrictEqual(["localhost"])
        })

        it("should use the parse function when defined", async () => {
            const option = {
                name: "port",
                parse: (...values: string[]) => parseInt(values[0], 10)
            }
            const result = await Option.parse(option, ["8080"])
            expect(result).toStrictEqual(8080)
        })

        it("should pass all values to the parse function", async () => {
            const option = {
                name: "tags",
                parse: (...values: string[]) => values.join(",")
            }
            const result = await Option.parse(option, ["a", "b", "c"])
            expect(result).toStrictEqual("a,b,c")
        })
    })

    describe("validation", () => {
        it("should throw when validate returns false", async () => {
            const option = {
                name: "port",
                validate: (...values: string[]) => values[0] !== "0"
            }
            await expect(Option.parse(option, ["0"])).rejects.toThrowError(
                `An option "port" does not accept "0" as an argument.`
            )
        })

        it("should not throw when validate returns true", async () => {
            const option = {
                name: "port",
                validate: (...values: string[]) => values[0] !== "0"
            }
            const result = await Option.parse(option, ["8080"])
            expect(result).toStrictEqual(["8080"])
        })

        it("should not throw when validate returns void", async () => {
            const option = {
                name: "port",
                validate: () => undefined
            }
            const result = await Option.parse(option, ["8080"])
            expect(result).toStrictEqual(["8080"])
        })

        it("should support async validate", async () => {
            const option = {
                name: "port",
                validate: async (...values: string[]) => values[0] !== "0"
            }
            await expect(Option.parse(option, ["0"])).rejects.toThrowError(
                `An option "port" does not accept "0" as an argument.`
            )
        })

        it("should run validate before parse", async () => {
            const calls: string[] = []
            const option = {
                name: "port",
                validate: () => {
                    calls.push("validate")
                    return true
                },
                parse: (..._values: string[]) => {
                    calls.push("parse")
                    return "parsed"
                }
            }
            await Option.parse(option, ["8080"])
            expect(calls).toStrictEqual(["validate", "parse"])
        })
    })
})

describe("defineOption", () => {
    it("should return the same option object", () => {
        const option = { name: "host" as const, description: "The host" }
        expect(defineOption(option)).toStrictEqual(option)
    })
})
