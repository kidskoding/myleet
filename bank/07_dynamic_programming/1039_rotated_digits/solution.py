def rotated_digits(n: int) -> int:
    count = 0
    for x in range(1, n + 1):
        digits = set(str(x))
        if digits & set("347"):
            continue
        if digits & set("2569"):
            count += 1
    return count
