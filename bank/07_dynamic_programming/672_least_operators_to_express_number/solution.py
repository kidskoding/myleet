def least_ops_express_target(x: int, target: int) -> int:
    pos = neg = 0
    power = 0
    while target:
        target, digit = divmod(target, x)
        cost = 2 if power == 0 else power
        if power == 0:
            pos, neg = digit * cost, (x - digit) * cost
        else:
            pos, neg = (
                min(digit * cost + pos, (digit + 1) * cost + neg),
                min((x - digit) * cost + pos, (x - digit - 1) * cost + neg),
            )
        power += 1
    return min(pos, power + neg) - 1
