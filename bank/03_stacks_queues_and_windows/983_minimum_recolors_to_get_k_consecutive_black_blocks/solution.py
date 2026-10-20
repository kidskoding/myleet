def minimum_recolors(blocks: str, k: int) -> int:
    whites = blocks[:k].count("W")
    best = whites
    for i in range(k, len(blocks)):
        whites += (blocks[i] == "W") - (blocks[i - k] == "W")
        best = min(best, whites)
    return best
