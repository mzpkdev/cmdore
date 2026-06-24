/**
 * Context handed to a `coerce` shorthand alongside the raw token.
 *
 * `name` is the declared option/argument name. `label` is its **canonical**
 * display form — `--<name>` for an option, the bare `<name>` for a positional
 * argument (no dashes). It deliberately does NOT echo an alias or the
 * user-typed token, so a reusable coercer can build a correct message without a
 * per-flag closure.
 */
export type CoerceContext = {
    name: string
    label: string
}
