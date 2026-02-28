import { CmdoreError } from "../errors"

type Option<TName = string, TValue = string> = {
    name: TName
    description?: string
    hint?: string
    alias?: string
    arity?: number
    required?: boolean
    defaultValue?: () => TValue
    validate?: (
        ...values: string[]
    ) => TValue | void | boolean | Promise<TValue | void | boolean>
    [property: string]: unknown
}

namespace Option {
    export const parse = async (
        option: Option,
        values: string[] | undefined
    ): Promise<unknown> => {
        if (values == null) {
            if (option.required) {
                throw new CmdoreError(`An option "${option.name}" is required.`)
            }
            return option.defaultValue?.()
        }
        let result: Awaited<ReturnType<NonNullable<Option["validate"]>>>
        try {
            result = await option.validate?.(...values)
        } catch (error) {
            throw new CmdoreError(error instanceof Error ? error.message : String(error))
        }
        if (result === false) {
            throw new CmdoreError(
                `An option "${option.name}" does not accept "${values.join(" ")}" as an argument.`
            )
        }
        if (result !== true && result !== undefined) {
            return result
        }
        return values
    }
}

export const defineOption = <TName extends string, TValue = string>(
    option: Option<TName, TValue>
): Option<TName, TValue> => option

export default Option
