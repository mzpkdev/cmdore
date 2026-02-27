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
    validate?: (...values: string[]) => void | boolean | Promise<unknown>
    parse?: (...values: string[]) => TValue
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
        if ((await argument.validate?.(value)) === false) {
            throw new CmdoreError(
                `An argument "${argument.name}" does not accept "${value}" as a value.`
            )
        }
        if (argument.parse) {
            return argument.parse(value)
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
        if ((await argument.validate?.(...values)) === false) {
            throw new CmdoreError(
                `An argument "${argument.name}" does not accept "${values.join(" ")}" as a value.`
            )
        }
        if (argument.parse) {
            return argument.parse(...values)
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
