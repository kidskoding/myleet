from functools import cmp_to_key


def largest_number(nums: list[int]) -> str:
    parts = [str(x) for x in nums]
    parts.sort(key=cmp_to_key(lambda a, b: -1 if a + b > b + a else (1 if a + b < b + a else 0)))
    joined = "".join(parts)
    return "0" if joined[0] == "0" else joined
