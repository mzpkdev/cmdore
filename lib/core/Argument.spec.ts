import { describe, expect, it } from "vitest"
import { CmdoreError } from "../errors"
import Argument, { defineArgument } from "./Argument"
import type { StandardSchemaV1 } from "./StandardSchema"

const numberSchema: StandardSchemaV1<number> = {
    "~standard": {
        version: 1,
        vendor: "test",
        validate: (value) => {
            const n = Number(value)
            return Number.isNaN(n)
                ? { issues: [{ message: "not a number" }] }
                : { value: n }
        }
    }
}

const rejectSchema: StandardSchemaV1<never> = {
    "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({ issues: [{ message: "rejected" }] })
    }
}

const upperSchema: StandardSchemaV1<string[]> = {
    "~standard": {
        version: 1,
        vendor: "test",
        validate: (value) => ({
            value: (value as string[]).map((v) => v.toUpperCase())
        })
    }
}

const asyncNumberSchema: StandardSchemaV1<number> = {
    "~standard": {
        version: 1,
        vendor: "test",
        validate: async (value) => {
            const n = Number(value)
            return Number.isNaN(n)
                ? { issues: [{ message: "not a number" }] }
                : { value: n }
        }
    }
}

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

    describe("when value is provided without a schema", () => {
        it("should return the raw string value", async () => {
            const argument = { name: "target" }
            const result = await Argument.parse(argument, "production")
            expect(result).toStrictEqual("production")
        })
    })

    describe("when a schema is provided", () => {
        it("should coerce the value", async () => {
            const argument = { name: "port", schema: numberSchema }
            const result = await Argument.parse(argument, "8080")
            expect(result).toStrictEqual(8080)
        })

        it("should treat 0 as a valid coerced result", async () => {
            const argument = { name: "count", schema: numberSchema }
            const result = await Argument.parse(argument, "0")
            expect(result).toStrictEqual(0)
        })

        it("should throw a CmdoreError with the issue message", async () => {
            const argument = { name: "port", schema: numberSchema }
            await expect(Argument.parse(argument, "abc")).rejects.toThrowError(
                "not a number"
            )
        })

        it("should throw a CmdoreError instance", async () => {
            const argument = { name: "target", schema: rejectSchema }
            await expect(Argument.parse(argument, "x")).rejects.toBeInstanceOf(
                CmdoreError
            )
        })

        it("should await an async schema", async () => {
            const argument = { name: "port", schema: asyncNumberSchema }
            const result = await Argument.parse(argument, "8080")
            expect(result).toStrictEqual(8080)
        })

        it("should reject via an async schema", async () => {
            const argument = { name: "port", schema: asyncNumberSchema }
            await expect(Argument.parse(argument, "abc")).rejects.toThrowError(
                "not a number"
            )
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

    it("should return an empty array when values are empty and not required", async () => {
        const argument = { name: "files", variadic: true }
        const result = await Argument.parseVariadic(argument, [])
        expect(result).toStrictEqual([])
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

    it("should return raw values array when no schema exists", async () => {
        const argument = { name: "files", variadic: true }
        const result = await Argument.parseVariadic(argument, [
            "a.ts",
            "b.ts",
            "c.ts"
        ])
        expect(result).toStrictEqual(["a.ts", "b.ts", "c.ts"])
    })

    it("should pass the values array to the schema", async () => {
        const argument = {
            name: "files",
            variadic: true,
            schema: upperSchema
        }
        const result = await Argument.parseVariadic(argument, ["a.ts", "b.ts"])
        expect(result).toStrictEqual(["A.TS", "B.TS"])
    })

    it("should throw a CmdoreError with the issue message", async () => {
        const argument = {
            name: "files",
            variadic: true,
            schema: rejectSchema
        }
        await expect(
            Argument.parseVariadic(argument, ["a.ts", "b.js"])
        ).rejects.toThrowError("rejected")
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
