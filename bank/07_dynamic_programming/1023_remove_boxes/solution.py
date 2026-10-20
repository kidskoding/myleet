from functools import cache


def remove_boxes(boxes: list[int]) -> int:
    @cache
    def dp(left: int, right: int, extra: int) -> int:
        if left > right:
            return 0
        while left < right and boxes[left + 1] == boxes[left]:
            left += 1
            extra += 1
        best = (extra + 1) ** 2 + dp(left + 1, right, 0)
        for mid in range(left + 2, right + 1):
            if boxes[mid] == boxes[left] and boxes[mid - 1] != boxes[left]:
                best = max(best, dp(left + 1, mid - 1, 0) + dp(mid, right, extra + 1))
        return best

    return dp(0, len(boxes) - 1, 0)
