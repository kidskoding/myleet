MOD = 10**9 + 7


def count_texts(pressed_keys: str) -> int:
    n = len(pressed_keys)
    dp = [0] * (n + 1)
    dp[0] = 1
    for i in range(1, n + 1):
        key = pressed_keys[i - 1]
        max_presses = 4 if key in "79" else 3
        for presses in range(1, max_presses + 1):
            if presses > i or pressed_keys[i - presses] != key:
                break
            dp[i] = (dp[i] + dp[i - presses]) % MOD
    return dp[n]
