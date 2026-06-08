import { CmdoreError } from "../errors"

type Option = {
    name: string
    description?: string
    hint?: string
    alias?: string
    arity?: number
    required?: boolean
    defaultValue?: () => unknown
    validate?: (...values: string[]) => unknown
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
            throw new CmdoreError(
                error instanceof Error ? error.message : String(error)
            )
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

export const defineOption = <const T extends Option>(option: T): T => option

export default Option
