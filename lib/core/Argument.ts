import { CmdoreError } from "../errors"

type Argument<
    TName = string,
    TValue = string,
    TVariadic extends boolean = boolean
> = {
    name: TName
    description?: string
    required?: boolean
    variadic?: TVariadic
    defaultValue?: () => TValue
    validate?: (
        ...values: string[]
    ) => TValue | void | boolean | Promise<TValue | void | boolean>
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

export const defineArgument = <
    TName extends string,
    TValue = string,
    TVariadic extends boolean = false
>(
    argument: Argument<TName, TValue, TVariadic>
): Argument<TName, TValue, TVariadic> => argument

export default Argument
