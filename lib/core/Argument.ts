import { CmdoreError } from "../errors"

type Argument = {
    name: string
    description?: string
    required?: boolean
    variadic?: boolean
    defaultValue?: () => unknown
    validate?: (...values: string[]) => unknown
}

namespace Argument {
    export const parse = async (
        argument: Argument,
        value: string | undefined
    ): Promise<unknown> => {
        if (value == null) {
            if (argument.required) {
                throw new CmdoreError(
                    `An argument "${argument.name}" is required.`
                )
            }
            return argument.defaultValue?.()
        }
        let result: Awaited<ReturnType<NonNullable<Argument["validate"]>>>
        try {
            result = await argument.validate?.(value)
        } catch (error) {
            throw new CmdoreError(
                error instanceof Error ? error.message : String(error)
            )
        }
        if (result === false) {
            throw new CmdoreError(
                `An argument "${argument.name}" does not accept "${value}" as a value.`
            )
        }
        if (result !== true && result !== undefined) {
            return result
        }
        return value
    }

    export const parseVariadic = async (
        argument: Argument,
        values: string[]
    ): Promise<unknown> => {
        if (values.length === 0) {
            if (argument.required) {
                throw new CmdoreError(
                    `An argument "${argument.name}" is required.`
                )
            }
            return argument.defaultValue?.()
        }
        let result: Awaited<ReturnType<NonNullable<Argument["validate"]>>>
        try {
            result = await argument.validate?.(...values)
        } catch (error) {
            throw new CmdoreError(
                error instanceof Error ? error.message : String(error)
            )
        }
        if (result === false) {
            throw new CmdoreError(
                `An argument "${argument.name}" does not accept "${values.join(" ")}" as a value.`
            )
        }
        if (result !== true && result !== undefined) {
            return result
        }
        return values
    }
}

export const defineArgument = <const T extends Argument>(argument: T): T =>
    argument

export default Argument
