def get_no_zero_integers(n: int) -> list[int]:
    for a in range(1, n):
        if "0" not in str(a) and "0" not in str(n - a):
            return [a, n - a]
    return []
