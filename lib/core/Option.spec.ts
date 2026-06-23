import { describe, expect, it } from "vitest"
import { CmdoreError } from "../errors"
import Option, { defineOption } from "./Option"
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

const joinSchema: StandardSchemaV1<string> = {
    "~standard": {
        version: 1,
        vendor: "test",
        validate: (value) => ({
            value: (value as string[]).join(",")
        })
    }
}

const rejectSchema: StandardSchemaV1<never> = {
    "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({ issues: [{ message: "rejected" }] })
    }
}

const multiIssueSchema: StandardSchemaV1<never> = {
    "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
            issues: [{ message: "first" }, { message: "second" }]
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

        it("should return false for an absent arity-0 option", async () => {
            const option = { name: "force", arity: 0 }
            const result = await Option.parse(option, undefined)
            expect(result).toStrictEqual(false)
        })

        it("should return the defaultValue result", async () => {
            const option = { name: "host", defaultValue: () => "localhost" }
            const result = await Option.parse(option, undefined)
            expect(result).toStrictEqual("localhost")
        })
    })

    describe("when values are provided without a schema", () => {
        it("should return a string array by default", async () => {
            const option = { name: "host" }
            const result = await Option.parse(option, ["localhost"])
            expect(result).toStrictEqual(["localhost"])
        })

        it("should return true for a present arity-0 option", async () => {
            const option = { name: "force", arity: 0 }
            const result = await Option.parse(option, [])
            expect(result).toStrictEqual(true)
        })

        it("should return a single string for an arity-1 option", async () => {
            const option = { name: "host", arity: 1 }
            const result = await Option.parse(option, ["localhost"])
            expect(result).toStrictEqual("localhost")
        })

        it("should return all values for a variadic (default arity) option", async () => {
            const option = { name: "tags" }
            const result = await Option.parse(option, ["a", "b", "c"])
            expect(result).toStrictEqual(["a", "b", "c"])
        })
    })

    describe("when a schema is provided", () => {
        it("should coerce the single value for an arity-1 option", async () => {
            const option = { name: "port", arity: 1, schema: numberSchema }
            const result = await Option.parse(option, ["8080"])
            expect(result).toStrictEqual(8080)
        })

        it("should treat 0 as a valid coerced result", async () => {
            const option = { name: "count", arity: 1, schema: numberSchema }
            const result = await Option.parse(option, ["0"])
            expect(result).toStrictEqual(0)
        })

        it("should pass the variadic array of values to the schema", async () => {
            const option = { name: "tags", schema: joinSchema }
            const result = await Option.parse(option, ["a", "b", "c"])
            expect(result).toStrictEqual("a,b,c")
        })

        it("should throw a CmdoreError with the issue message", async () => {
            const option = { name: "port", arity: 1, schema: numberSchema }
            await expect(Option.parse(option, ["abc"])).rejects.toThrowError(
                "not a number"
            )
        })

        it("should join multiple issue messages with a semicolon", async () => {
            const option = { name: "port", schema: multiIssueSchema }
            await expect(Option.parse(option, ["x"])).rejects.toThrowError(
                "first; second"
            )
        })

        it("should throw a CmdoreError instance", async () => {
            const option = { name: "port", schema: rejectSchema }
            await expect(Option.parse(option, ["x"])).rejects.toBeInstanceOf(
                CmdoreError
            )
        })

        it("should await an async schema", async () => {
            const option = { name: "port", arity: 1, schema: asyncNumberSchema }
            const result = await Option.parse(option, ["8080"])
            expect(result).toStrictEqual(8080)
        })

        it("should reject via an async schema", async () => {
            const option = { name: "port", arity: 1, schema: asyncNumberSchema }
            await expect(Option.parse(option, ["abc"])).rejects.toThrowError(
                "not a number"
            )
        })
    })
})

describe("defineOption", () => {
    it("should return the same option object", () => {
        const option = { name: "host" as const, description: "The host" }
        expect(defineOption(option)).toStrictEqual(option)
    })
})
