def occurrences_of_element(nums: list[int], queries: list[int], x: int) -> list[int]:
    positions = [i for i, v in enumerate(nums) if v == x]
    return [positions[q - 1] if q <= len(positions) else -1 for q in queries]
