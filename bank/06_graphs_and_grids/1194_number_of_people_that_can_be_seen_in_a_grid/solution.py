def see_people(heights: list[list[int]]) -> list[list[int]]:
    def line_counts(nums: list[int]) -> list[int]:
        n = len(nums)
        stack: list[int] = []
        ans = [0] * n
        for i in range(n - 1, -1, -1):
            while stack and stack[-1] < nums[i]:
                ans[i] += 1
                stack.pop()
            if stack:
                ans[i] += 1
            while stack and stack[-1] == nums[i]:
                stack.pop()
            stack.append(nums[i])
        return ans

    ans = [line_counts(row) for row in heights]
    rows, cols = len(heights), len(heights[0])
    for j in range(cols):
        add = line_counts([heights[i][j] for i in range(rows)])
        for i in range(rows):
            ans[i][j] += add[i]
    return ans
