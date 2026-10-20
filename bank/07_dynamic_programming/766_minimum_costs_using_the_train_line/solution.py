def minimum_costs(regular: list[int], express: list[int], express_cost: int) -> list[int]:
    on_regular, on_express = 0, express_cost
    costs = []
    for reg, exp in zip(regular, express):
        on_regular, on_express = (
            min(on_regular, on_express) + reg,
            min(on_express, on_regular + express_cost) + exp,
        )
        costs.append(min(on_regular, on_express))
    return costs
