def find_subsequences(nums: list[int]) -> list[list[int]]:
    result: list[list[int]] = []
    path: list[int] = []

    def backtrack(start: int) -> None:
        if len(path) >= 2:
            result.append(path[:])
        used: set[int] = set()
        for i in range(start, len(nums)):
            if nums[i] in used or (path and nums[i] < path[-1]):
                continue
            used.add(nums[i])
            path.append(nums[i])
            backtrack(i + 1)
            path.pop()

    backtrack(0)
    return result
