def largest_palindrome(n: int) -> int:
    if n == 1:
        return 9
    high = 10**n - 1
    low = 10 ** (n - 1)
    for half in range(high, low - 1, -1):
        palindrome = int(str(half) + str(half)[::-1])
        factor = high
        while factor * factor >= palindrome:
            if palindrome % factor == 0:
                return palindrome % 1337
            factor -= 1
    return -1
