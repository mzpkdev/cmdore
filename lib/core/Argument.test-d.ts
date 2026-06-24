import { assertType, describe, expectTypeOf, it } from "vitest"
import { defineArgument } from "./Argument"
import type { Argv } from "./Command"
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

type NumberSchema = typeof numberSchema

describe("Argv argument inference", () => {
    it("maps a plain argument to string", () => {
        const src = defineArgument({ name: "src", required: true })
        type T = Argv<readonly [], readonly [typeof src]>
        expectTypeOf<T["src"]>().toEqualTypeOf<string>()
    })

    it("maps a variadic argument to string[]", () => {
        const files = defineArgument({ name: "files", variadic: true })
        type T = Argv<readonly [], readonly [typeof files]>
        expectTypeOf<T["files"]>().toEqualTypeOf<string[]>()
    })

    it("adds `| undefined` when not required and no defaultValue", () => {
        const dst = defineArgument({ name: "dst" })
        type T = Argv<readonly [], readonly [typeof dst]>
        expectTypeOf<T["dst"]>().toEqualTypeOf<string | undefined>()
    })

    it("drops `| undefined` when required: true", () => {
        const src = defineArgument({ name: "src", required: true })
        type T = Argv<readonly [], readonly [typeof src]>
        expectTypeOf<T["src"]>().not.toEqualTypeOf<string | undefined>()
    })

    it("drops `| undefined` and uses the defaultValue's return when defaulted", () => {
        const target = defineArgument({
            name: "target",
            defaultValue: () => "prod"
        })
        type T = Argv<readonly [], readonly [typeof target]>
        expectTypeOf<T["target"]>().toEqualTypeOf<string>()
        expectTypeOf<T["target"]>().not.toEqualTypeOf<string | undefined>()
    })

    it("lets `schema` override the raw type (required schema arg -> number)", () => {
        const count = defineArgument({
            name: "count",
            required: true,
            schema: numberSchema
        })
        type T = Argv<readonly [], readonly [typeof count]>
        expectTypeOf<T["count"]>().toEqualTypeOf<
            StandardSchemaV1.InferOutput<NumberSchema>
        >()
        expectTypeOf<T["count"]>().toEqualTypeOf<number>()
        expectTypeOf<T["count"]>().not.toEqualTypeOf<string>()
    })

    it("keeps `| undefined` on a non-required schema argument", () => {
        const count = defineArgument({ name: "count", schema: numberSchema })
        type T = Argv<readonly [], readonly [typeof count]>
        expectTypeOf<T["count"]>().toEqualTypeOf<number | undefined>()
    })

    it("lets `coerce` set the type, keeping `| undefined` when not required", () => {
        const line = defineArgument({
            name: "line",
            coerce: (s: string) => Number(s)
        })
        type T = Argv<readonly [], readonly [typeof line]>
        expectTypeOf<T["line"]>().toEqualTypeOf<number | undefined>()
        expectTypeOf<T["line"]>().not.toEqualTypeOf<string | undefined>()
    })

    it("drops `| undefined` on a required `coerce` argument", () => {
        const line = defineArgument({
            name: "line",
            required: true,
            coerce: (s: string) => Number(s)
        })
        type T = Argv<readonly [], readonly [typeof line]>
        expectTypeOf<T["line"]>().toEqualTypeOf<number>()
        expectTypeOf<T["line"]>().not.toEqualTypeOf<number | undefined>()
    })
})

describe("defineArgument excess-key guard", () => {
    it("accepts every known Argument field", () => {
        const argument = defineArgument({
            name: "ok",
            description: "d",
            required: true,
            variadic: false,
            defaultValue: () => 1,
            coerce: (s: string) => Number(s),
            schema: numberSchema
        })
        assertType<string>(argument.name)
    })

    it("rejects an unknown property", () => {
        defineArgument({
            name: "y",
            // @ts-expect-error - `typo` is not a known Argument field
            typo: 1
        })
    })

    it("rejects the removed `validate` field", () => {
        defineArgument({
            name: "y",
            // @ts-expect-error - `validate` was removed in favor of `schema`
            validate: () => true
        })
    })
})
