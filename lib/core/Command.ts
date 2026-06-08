import type Argument from "./Argument"
import type Option from "./Option"

type Value<E, Default> = E extends {
    validate: (...a: any[]) => infer R
}
    ? [Exclude<Awaited<R>, void | boolean>] extends [never]
        ? Default
        : Exclude<Awaited<R>, void | boolean>
    : E extends { defaultValue: () => infer D }
      ? D
      : Default

type Options<O extends readonly Option[]> = number extends O["length"]
    ? {}
    : {
          [E in O[number] as E["name"] & string]: Value<E, string[]>
      }

type Arguments<A extends readonly Argument[]> = number extends A["length"]
    ? {}
    : {
          [E in A[number] as E["name"] & string]: E extends { variadic: true }
              ? Value<E, string>[]
              : Value<E, string>
      }

export type Argv<
    O extends readonly Option[] = readonly Option[],
    A extends readonly Argument[] = readonly Argument[]
> = Options<O> & Arguments<A>

export type Command<
    O extends readonly Option[] = readonly Option[],
    A extends readonly Argument[] = readonly Argument[]
> = {
    name: string
    description?: string
    examples?: string[]
    arguments?: A
    options?: O
    run?: (
        this: Command<O, A>,
        argv: Argv<O, A>
    ) => void | Promise<void> | unknown
    // [property: string]: unknown
}

export const defineCommand = <
    const O extends readonly Option[],
    const A extends readonly Argument[]
>(
    command: Command<O, A>
): Command<O, A> => command

export default Command
