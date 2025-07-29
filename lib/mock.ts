const mock = <TInstance>(instance: TInstance, property: keyof TInstance) => {
    const copy = instance[property]
    instance[property] = (() => {}) as typeof copy
    return () => {
        instance[property] = copy
    }
}

export default mock
