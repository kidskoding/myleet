def result_array(nums: list[int], k: int) -> list[int]:
    result = [0] * k
    ending = [0] * k
    for x in nums:
        r = x % k
        nxt = [0] * k
        nxt[r] += 1
        for rem, count in enumerate(ending):
            if count:
                nxt[rem * r % k] += count
        ending = nxt
        for rem in range(k):
            result[rem] += ending[rem]
    return result
