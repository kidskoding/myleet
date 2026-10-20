def can_see_persons_count(heights: list[int]) -> list[int]:
    answer = [0] * len(heights)
    stack: list[int] = []
    for i in range(len(heights) - 1, -1, -1):
        seen = 0
        while stack and stack[-1] < heights[i]:
            stack.pop()
            seen += 1
        if stack:
            seen += 1
        answer[i] = seen
        stack.append(heights[i])
    return answer
