def sort_jumbled(mapping: list[int], nums: list[int]) -> list[int]:
    def mapped(x: int) -> int:
        return int("".join(str(mapping[int(d)]) for d in str(x)))

    return sorted(nums, key=mapped)
