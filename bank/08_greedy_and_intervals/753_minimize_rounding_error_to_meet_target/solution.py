def minimize_error(prices: list[str], target: int) -> str:
    floor_total = 0
    fractions = []
    for price in prices:
        whole, frac = price.split(".")
        floor_total += int(whole)
        if int(frac):
            fractions.append(int(frac))
    need = target - floor_total
    if need < 0 or need > len(fractions):
        return "-1"
    fractions.sort(reverse=True)
    error = sum(1000 - f for f in fractions[:need]) + sum(fractions[need:])
    return f"{error // 1000}.{error % 1000:03d}"
