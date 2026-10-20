def bit_totals(m: int) -> tuple[int, int]:
    count = exponent_sum = 0
    b = 0
    while (1 << b) <= m:
        cycle = 1 << (b + 1)
        ones = (m + 1) // cycle * (1 << b) + max(0, (m + 1) % cycle - (1 << b))
        count += ones
        exponent_sum += ones * b
        b += 1
    return count, exponent_sum


def prefix_exponent(length: int) -> int:
    lo, hi = 0, 1
    while bit_totals(hi)[0] <= length:
        hi *= 2
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if bit_totals(mid)[0] <= length:
            lo = mid
        else:
            hi = mid - 1
    count, exponent_sum = bit_totals(lo)
    remaining = length - count
    nxt = lo + 1
    b = 0
    while remaining:
        if nxt >> b & 1:
            exponent_sum += b
            remaining -= 1
        b += 1
    return exponent_sum


def find_products_of_elements(queries: list[list[int]]) -> list[int]:
    return [pow(2, prefix_exponent(hi + 1) - prefix_exponent(lo), mod) for lo, hi, mod in queries]
