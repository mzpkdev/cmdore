import { describe, expectTypeOf, it } from "vitest"
import { defineCommand } from "./Command"
import { execute } from "./execute"

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
        expectTypeOf(execute(command)).toEqualTypeOf<Promise<void>>()
        // Git-style: an array of Commands resolves the array overload.
        expectTypeOf(execute([command])).toEqualTypeOf<Promise<void>>()
    })

    it("accepts a configuration object on both overloads", () => {
        const command = defineCommand({ name: "noop", run() {} })
        expectTypeOf(execute(command, { argv: [] })).toEqualTypeOf<
            Promise<void>
        >()
        expectTypeOf(execute([command], { argv: [] })).toEqualTypeOf<
            Promise<void>
        >()
    })
})
