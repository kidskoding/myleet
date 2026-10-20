def sum_zero(n: int) -> list[int]:
    result = [0] if n % 2 else []
    for x in range(1, n // 2 + 1):
        result.extend((x, -x))
    return result
