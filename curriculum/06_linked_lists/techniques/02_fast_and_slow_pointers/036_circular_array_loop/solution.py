def circular_array_loop(nums: list[int]) -> bool:
    # Problem 36: Circular Array Loop
    # Time: O(n)
    # Space: O(1)

    n = len(nums)

    def next_index(i: int) -> int:
        return (i + nums[i]) % n

    def same_direction(i: int, j: int) -> bool:
        return nums[i] > 0 and nums[j] > 0 or nums[i] < 0 and nums[j] < 0

    for start in range(n):
        if nums[start] == 0:
            continue

        slow = start
        fast = start

        while True:
            next_slow = next_index(slow)
            if not same_direction(slow, next_slow) or next_slow == slow:
                break

            next_fast = next_index(fast)
            if not same_direction(fast, next_fast) or next_fast == fast:
                break
            next_fast2 = next_index(next_fast)
            if not same_direction(next_fast, next_fast2) or next_fast2 == next_fast:
                break

            slow = next_slow
            fast = next_fast2
            if slow == fast:
                return True

        # Mark the path from this start as dead so later starts skip it.
        curr = start
        while same_direction(curr, next_index(curr)) and next_index(curr) != curr:
            nxt = next_index(curr)
            nums[curr] = 0
            curr = nxt

    return False
