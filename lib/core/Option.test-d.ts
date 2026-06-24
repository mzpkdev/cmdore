import { assertType, describe, expectTypeOf, it } from "vitest"
import type { CoerceContext } from "./Coerce"
import type { Argv } from "./Command"
import { defineOption } from "./Option"
import type { StandardSchemaV1 } from "./StandardSchema"

// A hand-rolled Standard Schema fixture whose InferOutput is `number`.
// No real schema library is used — only the `~standard` contract matters.
const numberSchema = {
    "~standard": {
        version: 1 as const,
        vendor: "type-test",
        validate: (value: unknown) => ({ value: Number(value) }),
        types: { input: undefined as unknown, output: 0 as number }
    }
} satisfies StandardSchemaV1<number>

type NumberSchema = typeof numberSchema

describe("Argv option inference", () => {
    it("maps arity 0 (no schema) to boolean, never `boolean | undefined`", () => {
        const force = defineOption({ name: "force", arity: 0 })
        type T = Argv<readonly [typeof force], readonly []>
        expectTypeOf<T["force"]>().toEqualTypeOf<boolean>()
        // arity 0 is always "present" — the optional `| undefined` must NOT appear.
        expectTypeOf<T["force"]>().not.toEqualTypeOf<boolean | undefined>()
    })

    it("maps arity 1 to string", () => {
        const host = defineOption({ name: "host", arity: 1, required: true })
        type T = Argv<readonly [typeof host], readonly []>
        expectTypeOf<T["host"]>().toEqualTypeOf<string>()
    })

    it("maps unbounded arity (variadic) to string[]", () => {
        const tags = defineOption({ name: "tags", required: true })
        type T = Argv<readonly [typeof tags], readonly []>
        expectTypeOf<T["tags"]>().toEqualTypeOf<string[]>()
    })

    it("adds `| undefined` when not required and no defaultValue", () => {
        const host = defineOption({ name: "host", arity: 1 })
        type T = Argv<readonly [typeof host], readonly []>
        expectTypeOf<T["host"]>().toEqualTypeOf<string | undefined>()
    })

    it("drops `| undefined` when required: true", () => {
        const env = defineOption({ name: "env", arity: 1, required: true })
        type T = Argv<readonly [typeof env], readonly []>
        expectTypeOf<T["env"]>().toEqualTypeOf<string>()
        expectTypeOf<T["env"]>().not.toEqualTypeOf<string | undefined>()
    })

    it("drops `| undefined` and uses the defaultValue's return when defaulted", () => {
        const port = defineOption({
            name: "port",
            arity: 1,
            defaultValue: () => "8080"
        })
        type T = Argv<readonly [typeof port], readonly []>
        expectTypeOf<T["port"]>().toEqualTypeOf<string>()
        expectTypeOf<T["port"]>().not.toEqualTypeOf<string | undefined>()
    })

    it("lets `schema` override the raw type (required schema option -> number)", () => {
        const count = defineOption({
            name: "count",
            arity: 1,
            required: true,
            schema: numberSchema
        })
        type T = Argv<readonly [typeof count], readonly []>
        expectTypeOf<T["count"]>().toEqualTypeOf<
            StandardSchemaV1.InferOutput<NumberSchema>
        >()
        expectTypeOf<T["count"]>().toEqualTypeOf<number>()
        // schema overrides the arity:1 `string` raw entirely.
        expectTypeOf<T["count"]>().not.toEqualTypeOf<string>()
    })

    it("keeps `| undefined` on a non-required schema option (number | undefined)", () => {
        const limit = defineOption({
            name: "limit",
            arity: 1,
            schema: numberSchema
        })
        type T = Argv<readonly [typeof limit], readonly []>
        expectTypeOf<T["limit"]>().toEqualTypeOf<number | undefined>()
    })

    it("lets `coerce` set the type, keeping `| undefined` when not required (number | undefined)", () => {
        const line = defineOption({
            name: "line",
            arity: 1,
            coerce: (s: string) => Number(s)
        })
        type T = Argv<readonly [typeof line], readonly []>
        expectTypeOf<T["line"]>().toEqualTypeOf<number | undefined>()
        expectTypeOf<T["line"]>().not.toEqualTypeOf<string | undefined>()
    })

    it("infers from a 2-arg `(raw, ctx)` coerce just like the 1-arg form (number | undefined)", () => {
        const line = defineOption({
            name: "line",
            arity: 1,
            coerce: (s: string, ctx: CoerceContext) =>
                Number(s) + ctx.label.length
        })
        type T = Argv<readonly [typeof line], readonly []>
        expectTypeOf<T["line"]>().toEqualTypeOf<number | undefined>()
        expectTypeOf<T["line"]>().not.toEqualTypeOf<string | undefined>()
    })

    it("drops `| undefined` on a required `coerce` option", () => {
        const line = defineOption({
            name: "line",
            arity: 1,
            required: true,
            coerce: (s: string) => Number(s)
        })
        type T = Argv<readonly [typeof line], readonly []>
        expectTypeOf<T["line"]>().toEqualTypeOf<number>()
        expectTypeOf<T["line"]>().not.toEqualTypeOf<number | undefined>()
    })

    it("lets `coerce` win over `schema` (precedence)", () => {
        const line = defineOption({
            name: "line",
            arity: 1,
            required: true,
            coerce: (s: string) => s.length > 0,
            schema: numberSchema
        })
        type T = Argv<readonly [typeof line], readonly []>
        expectTypeOf<T["line"]>().toEqualTypeOf<boolean>()
    })

    it("applies schema override to arity 0 (present, so no `| undefined`)", () => {
        const verbosity = defineOption({
            name: "verbosity",
            arity: 0,
            schema: numberSchema
        })
        type T = Argv<readonly [typeof verbosity], readonly []>
        expectTypeOf<T["verbosity"]>().toEqualTypeOf<number>()
        expectTypeOf<T["verbosity"]>().not.toEqualTypeOf<boolean>()
    })
})

describe("defineOption excess-key guard", () => {
    it("accepts every known Option field", () => {
        const option = defineOption({
            name: "ok",
            description: "d",
            hint: "h",
            alias: "o",
            arity: 1,
            required: true,
            defaultValue: () => 1,
            coerce: (s: string) => Number(s),
            schema: numberSchema
        })
        assertType<string>(option.name)
    })

    it("rejects an unknown property", () => {
        defineOption({
            name: "x",
            // @ts-expect-error - `typo` is not a known Option field
            typo: 1
        })
    })

    it("rejects the removed `validate` field", () => {
        defineOption({
            name: "x",
            // @ts-expect-error - `validate` was removed in favor of `schema`
            validate: () => true
        })
    })
})
