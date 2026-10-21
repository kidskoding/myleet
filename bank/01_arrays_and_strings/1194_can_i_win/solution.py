from functools import cache


def can_i_win(max_choosable_integer: int, desired_total: int) -> bool:
    total = max_choosable_integer * (max_choosable_integer + 1) // 2
    if total < desired_total:
        return False
    if desired_total <= 0:
        return True

    @cache
    def dfs(mask: int, remain: int) -> bool:
        for i in range(max_choosable_integer):
            bit = 1 << i
            if mask & bit:
                continue
            if i + 1 >= remain or not dfs(mask | bit, remain - (i + 1)):
                return True
        return False

    return dfs(0, desired_total)
