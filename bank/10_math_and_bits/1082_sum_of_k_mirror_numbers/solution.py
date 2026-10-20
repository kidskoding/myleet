def k_mirror(k: int, n: int) -> int:
    def is_base_k_palindrome(x: int) -> bool:
        digits: list[int] = []
        while x:
            digits.append(x % k)
            x //= k
        return digits == digits[::-1]

    total = 0
    found = 0
    half = 1
    while True:
        for even in (False, True):
            for prefix in range(10 ** (half - 1), 10**half):
                text = str(prefix)
                tail = text[::-1] if even else text[-2::-1]
                value = int(text + tail)
                if is_base_k_palindrome(value):
                    total += value
                    found += 1
                    if found == n:
                        return total
        half += 1
