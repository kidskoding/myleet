def new21_game(n: int, k: int, max_pts: int) -> float:
    if k == 0 or n >= k - 1 + max_pts:
        return 1.0
    prob = [0.0] * (n + 1)
    prob[0] = 1.0
    window = 1.0
    answer = 0.0
    for x in range(1, n + 1):
        prob[x] = window / max_pts
        if x < k:
            window += prob[x]
        else:
            answer += prob[x]
        if x - max_pts >= 0 and x - max_pts < k:
            window -= prob[x - max_pts]
    return answer
