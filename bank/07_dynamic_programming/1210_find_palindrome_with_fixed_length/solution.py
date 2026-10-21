def kth_palindrome(queries: list[int], int_length: int) -> list[int]:
    half = (int_length + 1) // 2
    start, end = 10 ** (half - 1), 10**half - 1
    ans: list[int] = []
    for q in queries:
        v = start + q - 1
        if v > end:
            ans.append(-1)
            continue
        s = str(v)
        s += s[::-1][int_length % 2 :]
        ans.append(int(s))
    return ans
