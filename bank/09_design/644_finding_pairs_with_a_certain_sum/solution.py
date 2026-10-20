from collections import Counter


class FindSumPairs:
    def __init__(self, nums1: list[int], nums2: list[int]) -> None:
        self.nums1 = nums1
        self.nums2 = list(nums2)
        self.freq = Counter(nums2)

    def add(self, index: int, val: int) -> None:
        old = self.nums2[index]
        self.freq[old] -= 1
        self.nums2[index] = old + val
        self.freq[old + val] += 1

    def count(self, tot: int) -> int:
        return sum(self.freq[tot - x] for x in self.nums1)
