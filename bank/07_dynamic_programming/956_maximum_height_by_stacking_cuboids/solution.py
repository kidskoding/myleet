def max_height(cuboids: list[list[int]]) -> int:
    boxes = sorted(sorted(c) for c in cuboids)
    dp = [b[2] for b in boxes]
    for i, (w, ln, h) in enumerate(boxes):
        for j in range(i):
            pw, pl, ph = boxes[j]
            if pw <= w and pl <= ln and ph <= h:
                dp[i] = max(dp[i], dp[j] + h)
    return max(dp)
