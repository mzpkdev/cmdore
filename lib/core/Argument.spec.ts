import { describe, expect, it } from "vitest"
import Argument, { defineArgument } from "./Argument"

describe("Argument.parse", () => {
    describe("when value is undefined", () => {
        it("should throw when argument is required", async () => {
            const argument = { name: "target", required: true }
            await expect(
                Argument.parse(argument, undefined)
            ).rejects.toThrowError(`An argument "target" is required.`)
        })

        it("should return undefined when not required and no default", async () => {
            const argument = { name: "target" }
            const result = await Argument.parse(argument, undefined)
            expect(result).toStrictEqual(undefined)
        })

        it("should return the defaultValue result", async () => {
            const argument = {
                name: "target",
                defaultValue: () => "production"
            }
            const result = await Argument.parse(argument, undefined)
            expect(result).toStrictEqual("production")
        })
    })

    describe("when value is provided", () => {
        it("should return raw value when no parse function exists", async () => {
            const argument = { name: "target" }
            const result = await Argument.parse(argument, "production")
            expect(result).toStrictEqual("production")
        })

        it("should use the parse function when defined", async () => {
            const argument = {
                name: "port",
                parse: (value: string) => parseInt(value, 10)
            }
            const result = await Argument.parse(argument, "8080")
            expect(result).toStrictEqual(8080)
        })
    })

    describe("validation", () => {
        it("should throw when validate returns false", async () => {
            const argument = {
                name: "target",
                validate: (value: string) => value !== "invalid"
            }
            await expect(
                Argument.parse(argument, "invalid")
            ).rejects.toThrowError(
                `An argument "target" does not accept "invalid" as a value.`
            )
        })

        it("should not throw when validate returns true", async () => {
            const argument = {
                name: "target",
                validate: (value: string) => value !== "invalid"
            }
            const result = await Argument.parse(argument, "production")
            expect(result).toStrictEqual("production")
        })

        it("should not throw when validate returns void", async () => {
            const argument = {
                name: "target",
                validate: () => undefined
            }
            const result = await Argument.parse(argument, "production")
            expect(result).toStrictEqual("production")
        })

        it("should support async validate", async () => {
            const argument = {
                name: "target",
                validate: async (value: string) => value !== "invalid"
            }
            await expect(
                Argument.parse(argument, "invalid")
            ).rejects.toThrowError(
                `An argument "target" does not accept "invalid" as a value.`
            )
        })

        it("should run validate before parse", async () => {
            const calls: string[] = []
            const argument = {
                name: "target",
                validate: () => {
                    calls.push("validate")
                    return true
                },
                parse: (_value: string) => {
                    calls.push("parse")
                    return "parsed"
                }
            }
            await Argument.parse(argument, "production")
            expect(calls).toStrictEqual(["validate", "parse"])
        })
    })
})

describe("Argument.parseVariadic", () => {
    it("should throw when values are empty and argument is required", async () => {
        const argument = { name: "files", required: true, variadic: true }
        await expect(Argument.parseVariadic(argument, [])).rejects.toThrowError(
            `An argument "files" is required.`
        )
    })

    it("should return undefined when values are empty and not required", async () => {
        const argument = { name: "files", variadic: true }
        const result = await Argument.parseVariadic(argument, [])
        expect(result).toStrictEqual(undefined)
    })

    it("should return defaultValue when values are empty", async () => {
        const argument = {
            name: "files",
            variadic: true,
            defaultValue: () => ["README.md"]
        }
        const result = await Argument.parseVariadic(argument, [])
        expect(result).toStrictEqual(["README.md"])
    })

    it("should return raw values array when no parse function exists", async () => {
        const argument = { name: "files", variadic: true }
        const result = await Argument.parseVariadic(argument, [
            "a.ts",
            "b.ts",
            "c.ts"
        ])
        expect(result).toStrictEqual(["a.ts", "b.ts", "c.ts"])
    })

    it("should use the parse function when defined", async () => {
        const argument = {
            name: "files",
            variadic: true,
            parse: (...values: string[]) => values.map((v) => v.toUpperCase())
        }
        const result = await Argument.parseVariadic(argument, ["a.ts", "b.ts"])
        expect(result).toStrictEqual(["A.TS", "B.TS"])
    })

    it("should throw when validate returns false", async () => {
        const argument = {
            name: "files",
            variadic: true,
            validate: (...values: string[]) =>
                values.every((v) => v.endsWith(".ts"))
        }
        await expect(
            Argument.parseVariadic(argument, ["a.ts", "b.js"])
        ).rejects.toThrowError(
            `An argument "files" does not accept "a.ts b.js" as a value.`
        )
    })
})

describe("defineArgument", () => {
    it("should return the same argument object", () => {
        const argument = {
            name: "target" as const,
            description: "Deploy target"
        }
        expect(defineArgument(argument)).toStrictEqual(argument)
    })
})
