import { describe, expectTypeOf, it } from "vitest"
import { defineCommand } from "./Command"
import { execute } from "./execute"

const metadata = { name: "test", version: "0.0.0", description: "A test CLI" }

describe("execute overload accepts a single command and an array", () => {
    it("typechecks a single command (commandless) and an array (git-style)", () => {
        const command = defineCommand({
            name: "greet",
            arguments: [{ name: "name", required: true }],
            options: [{ name: "loud", alias: "l", arity: 0 }],
            run(argv) {
                // required positional -> string (not string | undefined)
                expectTypeOf(argv.name).toEqualTypeOf<string>()
                // arity 0 option -> boolean (never undefined)
                expectTypeOf(argv.loud).toEqualTypeOf<boolean>()
            }
        })
        // Commandless: a single Command resolves the scalar overload.
        expectTypeOf(execute(command, { metadata })).toEqualTypeOf<
            Promise<void>
        >()
        // Git-style: an array of Commands resolves the array overload.
        expectTypeOf(execute([command], { metadata })).toEqualTypeOf<
            Promise<void>
        >()
    })

    it("accepts a configuration object on both overloads", () => {
        const command = defineCommand({ name: "noop", run() {} })
        expectTypeOf(execute(command, { argv: [], metadata })).toEqualTypeOf<
            Promise<void>
        >()
        expectTypeOf(execute([command], { argv: [], metadata })).toEqualTypeOf<
            Promise<void>
        >()
    })
})

describe("execute requires metadata in its configuration", () => {
    it("rejects a call with no configuration at all", () => {
        const command = defineCommand({ name: "noop", run() {} })
        // @ts-expect-error - config (and thus metadata) is required.
        execute(command)
        // @ts-expect-error - config (and thus metadata) is required.
        execute([command])
    })

    it("rejects a configuration object that omits metadata", () => {
        const command = defineCommand({ name: "noop", run() {} })
        // @ts-expect-error - metadata is a required field of Configuration.
        execute(command, {})
        // @ts-expect-error - metadata is a required field of Configuration.
        execute([command], {})
        // @ts-expect-error - metadata is still required when other fields exist.
        execute([command], { argv: [] })
    })
})
