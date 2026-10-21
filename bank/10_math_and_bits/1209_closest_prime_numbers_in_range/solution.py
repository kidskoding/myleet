def closest_primes(left: int, right: int) -> list[int]:
    if right < 2:
        return [-1, -1]
    is_prime = [True] * (right + 1)
    is_prime[0] = is_prime[1] = False
    for i in range(2, int(right**0.5) + 1):
        if is_prime[i]:
            step = i
            start = i * i
            is_prime[start : right + 1 : step] = [False] * (((right - start) // step) + 1)
    primes = [i for i in range(left, right + 1) if is_prime[i]]
    if len(primes) < 2:
        return [-1, -1]
    best = [-1, -1]
    best_gap = right - left + 1
    for a, b in zip(primes, primes[1:]):
        if b - a < best_gap:
            best_gap = b - a
            best = [a, b]
    return best
