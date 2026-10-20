def find_strobogrammatic(n: int) -> list[str]:
    # Time: O(5^(n/2) * n).
    # Space: O(5^(n/2) * n) for the output.
    pairs = [("0", "0"), ("1", "1"), ("6", "9"), ("8", "8"), ("9", "6")]

    def build(length: int) -> list[str]:
        if length == 0:
            return [""]
        if length == 1:
            return ["0", "1", "8"]
        res = []
        for mid in build(length - 2):
            for a, b in pairs:
                if length == n and a == "0":
                    continue
                res.append(a + mid + b)
        return res

    return build(n)
