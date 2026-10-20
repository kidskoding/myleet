def tallest_billboard(rods: list[int]) -> int:
    best = {0: 0}
    for rod in rods:
        nxt = dict(best)
        for diff, shorter in best.items():
            nxt[diff + rod] = max(nxt.get(diff + rod, -1), shorter)
            new_diff = abs(diff - rod)
            nxt[new_diff] = max(nxt.get(new_diff, -1), shorter + min(diff, rod))
        best = nxt
    return best[0]
