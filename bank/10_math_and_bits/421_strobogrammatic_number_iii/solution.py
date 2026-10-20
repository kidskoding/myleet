def strobogrammatic_in_range(low: str, high: str) -> int:
    # Time: O(5^(L/2) * L) where L = len(high).
    # Space: O(5^(L/2) * L).
    pairs = [("0", "0"), ("1", "1"), ("6", "9"), ("8", "8"), ("9", "6")]

    def build(length: int, total: int) -> list[str]:
        if length == 0:
            return [""]
        if length == 1:
            return ["0", "1", "8"]
        res = []
        for mid in build(length - 2, total):
            for a, b in pairs:
                if length == total and a == "0":
                    continue
                res.append(a + mid + b)
        return res

    count = 0
    for length in range(len(low), len(high) + 1):
        for s in build(length, length):
            if length == len(low) and s < low:
                continue
            if length == len(high) and s > high:
                continue
            count += 1
    return count
