import heapq

from list_node import ListNode  # noqa: F401


class Reader:
    # Interface provided by the problem.

    def get(self, index: int) -> int:
        raise NotImplementedError


def two_sum(nums: list[int], target: int) -> list[int]:
    # Problem 1: Two Sum
    # Key idea: complement lookup in a hash map.

    # Time: O(n) one pass
    # Space: O(n) the map

    seen: dict[int, int] = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []


def three_sum(reader: Reader, n: int) -> list[list[int]]:
    # Problem 2: 3Sum
    # Key idea: sort then two pointers.

    # Time:
    # Space:

    raise NotImplementedError


class Codec:
    # Problem 3: Encode and Decode Strings
    # Key idea: length prefix.

    def encode(self, strs: list[str]) -> str:
        return "".join(f"{len(s)}#{s}" for s in strs)

    def decode(self, s: str) -> list[str]:
        raise NotImplementedError


def unused_heap() -> int:
    return heapq.heappop([1])
