MOD = 10**9 + 7


def num_ways(words: list[str], target: str) -> int:
    width = len(words[0])
    counts = [[0] * 26 for _ in range(width)]
    for word in words:
        for col, ch in enumerate(word):
            counts[col][ord(ch) - 97] += 1
    ways = [0] * (len(target) + 1)
    ways[0] = 1
    for col in range(width):
        for i in range(min(col + 1, len(target)), 0, -1):
            c = counts[col][ord(target[i - 1]) - 97]
            if c:
                ways[i] = (ways[i] + ways[i - 1] * c) % MOD
    return ways[len(target)]
