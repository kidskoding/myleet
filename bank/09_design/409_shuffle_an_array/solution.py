import random


class Solution:
    def __init__(self, nums: list[int]) -> None:
        # Time: O(n).
        # Space: O(n).
        self.original = list(nums)

    def reset(self) -> list[int]:
        # Time: O(n).
        # Space: O(n).
        return list(self.original)

    def shuffle(self) -> list[int]:
        # Time: O(n).
        # Space: O(n).
        arr = list(self.original)
        for i in range(len(arr) - 1, 0, -1):
            j = random.randint(0, i)
            arr[i], arr[j] = arr[j], arr[i]
        return arr
