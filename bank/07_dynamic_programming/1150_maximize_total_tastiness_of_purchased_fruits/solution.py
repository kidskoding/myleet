def max_tastiness(price: list[int], tastiness: list[int], max_amount: int, max_coupons: int) -> int:
    dp = [[0] * (max_coupons + 1) for _ in range(max_amount + 1)]
    for cost, taste in zip(price, tastiness):
        half = cost // 2
        for money in range(max_amount, -1, -1):
            for coupons in range(max_coupons, -1, -1):
                best = dp[money][coupons]
                if money >= cost:
                    best = max(best, dp[money - cost][coupons] + taste)
                if coupons and money >= half:
                    best = max(best, dp[money - half][coupons - 1] + taste)
                dp[money][coupons] = best
    return dp[max_amount][max_coupons]
