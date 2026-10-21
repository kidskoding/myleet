def maximum_white_tiles(tiles: list[list[int]], carpet_len: int) -> int:
    tiles = sorted(tiles)
    n = len(tiles)
    pref = [0] * (n + 1)
    for i, (l, r) in enumerate(tiles):
        pref[i + 1] = pref[i] + (r - l + 1)
    ans = 0
    j = 0
    for i in range(n):
        start = tiles[i][0]
        end = start + carpet_len - 1
        while j < n and tiles[j][1] <= end:
            j += 1
        covered = pref[j] - pref[i]
        if j < n and tiles[j][0] <= end:
            covered += end - tiles[j][0] + 1
        ans = max(ans, covered)
    return ans
