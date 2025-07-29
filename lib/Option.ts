import { ValidationError } from "@/errors"

type Option<TName = string, TValue = unknown> = {
    name: TName
    description?: string
    alias?: string
    required?: string
    defaultValue?: () => TValue
    validator?: (values: string[]) => void | boolean
    parser?: (values: string[]) => TValue
}

namespace Option {
    export const parse = (option: Option, values: string[] | undefined): unknown => {
        if (values == null) {
            if (option.required) {
                throw new ValidationError(`An option "${option.name}" is required.`)
            }
            return option.defaultValue?.()
        }
        if (option.validator?.(values) == false) {
            throw new ValidationError(
                `An option "${option.name}" does not accept "${values.join(" ")}" as an argument.`
            )
        }
        return option.parser?.(values)
    }
}

export const defineOption = <
    TName extends string, TValue
>(option: Option<TName, TValue>): Option<TName, TValue> => option


export default Option
