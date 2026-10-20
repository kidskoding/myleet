def is_valid_palindrome(s: str, k: int) -> bool:
    n = len(s)
    longest = [0] * n
    for i in range(n - 1, -1, -1):
        longest[i] = 1
        inner = 0
        for j in range(i + 1, n):
            previous = longest[j]
            if s[i] == s[j]:
                longest[j] = inner + 2
            else:
                longest[j] = max(longest[j], longest[j - 1])
            inner = previous
    return n - longest[n - 1] <= k
