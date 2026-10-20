def final_prices(prices: list[int]) -> list[int]:
    out = prices[:]
    stack: list[int] = []
    for i, price in enumerate(prices):
        while stack and prices[stack[-1]] >= price:
            out[stack.pop()] -= price
        stack.append(i)
    return out
