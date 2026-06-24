import { describe, expectTypeOf, it } from "vitest"
import { defineCommand } from "./Command"
import type { StandardSchemaV1 } from "./StandardSchema"

// Hand-rolled Standard Schema fixture whose InferOutput is `number`.
const numberSchema = {
    "~standard": {
        version: 1 as const,
        vendor: "type-test",
        validate: (value: unknown) => ({ value: Number(value) }),
        types: { input: undefined as unknown, output: 0 as number }
    }
} satisfies StandardSchemaV1<number>

describe("defineCommand run(argv) inference", () => {
    it("types argv from inline options and arguments", () => {
        defineCommand({
            name: "deploy",
            arguments: [
                { name: "environment", required: true },
                { name: "extras", variadic: true }
            ],
            options: [
                { name: "force", arity: 0 },
                { name: "host", arity: 1 },
                { name: "port", arity: 1, defaultValue: () => "8080" }
            ],
            run(argv) {
                // arity 0 -> boolean (never undefined)
                expectTypeOf(argv.force).toEqualTypeOf<boolean>()
                // arity 1, required absent -> string | undefined
                expectTypeOf(argv.host).toEqualTypeOf<string | undefined>()
                // defaulted -> string (no undefined)
                expectTypeOf(argv.port).toEqualTypeOf<string>()
                // required positional -> string
                expectTypeOf(argv.environment).toEqualTypeOf<string>()
                // variadic positional -> string[]
                expectTypeOf(argv.extras).toEqualTypeOf<string[]>()
            }
        })
    })

    it("propagates a schema's InferOutput into argv at execute level", () => {
        defineCommand({
            name: "scale",
            arguments: [
                { name: "count", required: true, schema: numberSchema }
            ],
            options: [
                {
                    name: "limit",
                    arity: 1,
                    required: true,
                    schema: numberSchema
                }
            ],
            run(argv) {
                expectTypeOf(argv.count).toEqualTypeOf<number>()
                expectTypeOf(argv.limit).toEqualTypeOf<number>()
            }
        })
    })

    it("infers argv from a `coerce` shorthand (option -> number | undefined)", () => {
        defineCommand({
            name: "goto",
            options: [
                { name: "line", arity: 1, coerce: (s: string) => Number(s) }
            ],
            run(argv) {
                expectTypeOf(argv.line).toEqualTypeOf<number | undefined>()
            }
        })
    })

    it("keeps `| undefined` on non-required schema members in argv", () => {
        defineCommand({
            name: "query",
            arguments: [{ name: "count", schema: numberSchema }],
            options: [{ name: "limit", arity: 1, schema: numberSchema }],
            run(argv) {
                expectTypeOf(argv.count).toEqualTypeOf<number | undefined>()
                expectTypeOf(argv.limit).toEqualTypeOf<number | undefined>()
            }
        })
    })
})
