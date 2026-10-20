def triangle_type(nums: list[int]) -> str:
    a, b, c = sorted(nums)
    if a + b <= c:
        return "none"
    distinct = len({a, b, c})
    if distinct == 1:
        return "equilateral"
    if distinct == 2:
        return "isosceles"
    return "scalene"
