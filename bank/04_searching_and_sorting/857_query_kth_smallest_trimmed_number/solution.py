def smallest_trimmed_numbers(nums: list[str], queries: list[list[int]]) -> list[int]:
    answer = []
    for k, trim in queries:
        ranked = sorted(range(len(nums)), key=lambda i: (nums[i][-trim:], i))
        answer.append(ranked[k - 1])
    return answer
