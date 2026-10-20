def make_anti_palindrome(s: str) -> str:
    chars = sorted(s)
    n = len(chars)
    mid = n // 2
    i = mid
    while i < n and chars[i] == chars[mid - 1]:
        i += 1
    j = mid
    while j < n and chars[j] == chars[n - 1 - j]:
        if i >= n:
            return "-1"
        chars[i], chars[j] = chars[j], chars[i]
        i += 1
        j += 1
    return "".join(chars)
