def max_upgrades(count: list[int], upgrade: list[int], sell: list[int], money: list[int]) -> list[int]:
    return [
        min(servers, (cash + servers * price) // (cost + price))
        for servers, cost, price, cash in zip(count, upgrade, sell, money)
    ]
