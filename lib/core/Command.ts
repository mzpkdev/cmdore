import type Argument from "./Argument"
import type Option from "./Option"
import type { StandardSchemaV1 } from "./StandardSchema"

type Value<TElement, TDefault> = TElement extends {
    schema: StandardSchemaV1
}
    ? StandardSchemaV1.InferOutput<TElement["schema"]>
    : TElement extends { defaultValue: () => infer TDefaultValue }
      ? TDefaultValue
      : TDefault

type Raw<TElement> = TElement extends { arity: 0 }
    ? boolean
    : TElement extends { arity: 1 }
      ? string
      : string[]

type Present<TElement> = TElement extends { required: true }
    ? true
    : TElement extends { arity: 0 }
      ? true
      : TElement extends { defaultValue: (...a: any[]) => any }
        ? true
        : false

type Options<TOptions extends readonly Option[]> =
    number extends TOptions["length"]
        ? // biome-ignore lint/complexity/noBannedTypes: {} is the "no known keys" fallback when the array isn't a const tuple; it intersects cleanly in Argv and is the firewall against deep-nesting TS2589
          {}
        : {
              [TElement in TOptions[number] as TElement["name"] &
                  string]: Present<TElement> extends true
                  ? Value<TElement, Raw<TElement>>
                  : Value<TElement, Raw<TElement>> | undefined
          }

type Arguments<TArguments extends readonly Argument[]> =
    number extends TArguments["length"]
        ? // biome-ignore lint/complexity/noBannedTypes: {} is the "no known keys" fallback when the array isn't a const tuple; it intersects cleanly in Argv and is the firewall against deep-nesting TS2589
          {}
        : {
              [TElement in TArguments[number] as TElement["name"] &
                  string]: TElement extends { variadic: true }
                  ? Value<TElement, string[]>
                  : Present<TElement> extends true
                    ? Value<TElement, string>
                    : Value<TElement, string> | undefined
          }

export type Argv<
    TOptions extends readonly Option[] = readonly Option[],
    TArguments extends readonly Argument[] = readonly Argument[]
> = Options<TOptions> & Arguments<TArguments>

export type Command<
    TOptions extends readonly Option[] = readonly Option[],
    TArguments extends readonly Argument[] = readonly Argument[]
> = {
    name: string
    description?: string
    examples?: string[]
    arguments?: TArguments
    options?: TOptions
    run: (
        this: Command<TOptions, TArguments>,
        argv: Argv<TOptions, TArguments>
    ) => void | Promise<void> | unknown
    // [property: string]: unknown
}

export const defineCommand = <
    const TOptions extends readonly Option[],
    const TArguments extends readonly Argument[]
>(
    command: Command<TOptions, TArguments>
): Command<TOptions, TArguments> => command

export type { Command as default }
