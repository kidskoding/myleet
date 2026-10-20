def count_fair_pairs(nums: list[int], lower: int, upper: int) -> int:
    values = sorted(nums)

    def pairs_at_most(bound: int) -> int:
        count = 0
        i, j = 0, len(values) - 1
        while i < j:
            if values[i] + values[j] <= bound:
                count += j - i
                i += 1
            else:
                j -= 1
        return count

    return pairs_at_most(upper) - pairs_at_most(lower - 1)
