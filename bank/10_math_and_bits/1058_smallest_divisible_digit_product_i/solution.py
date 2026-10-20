def smallest_number(n: int, t: int) -> int:
    x = n
    while True:
        product = 1
        for ch in str(x):
            product *= int(ch)
        if product % t == 0:
            return x
        x += 1
