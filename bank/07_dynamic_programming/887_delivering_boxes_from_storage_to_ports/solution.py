from collections import deque


def box_delivering(boxes: list[list[int]], ports_count: int, max_boxes: int, max_weight: int) -> int:
    n = len(boxes)
    changes = [0] * n
    for i in range(1, n):
        changes[i] = changes[i - 1] + (boxes[i][0] != boxes[i - 1][0])
    weight = [0] * (n + 1)
    for i, (_, w) in enumerate(boxes):
        weight[i + 1] = weight[i] + w
    dp = [0] * (n + 1)
    window: deque[int] = deque([0])
    for i in range(1, n + 1):
        while i - window[0] > max_boxes or weight[i] - weight[window[0]] > max_weight:
            window.popleft()
        j = window[0]
        dp[i] = dp[j] - changes[j] + changes[i - 1] + 2
        if i < n:
            key = dp[i] - changes[i]
            while window and dp[window[-1]] - changes[window[-1]] >= key:
                window.pop()
            window.append(i)
    return dp[n]
