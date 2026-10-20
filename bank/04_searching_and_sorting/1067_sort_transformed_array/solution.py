def sort_transformed_array(nums: list[int], a: int, b: int, c: int) -> list[int]:
    def f(x: int) -> int:
        return a * x * x + b * x + c

    n = len(nums)
    out = [0] * n
    i, j = 0, n - 1
    idx = n - 1 if a >= 0 else 0
    while i <= j:
        fi, fj = f(nums[i]), f(nums[j])
        if a >= 0:
            if fi >= fj:
                out[idx] = fi
                i += 1
            else:
                out[idx] = fj
                j -= 1
            idx -= 1
        else:
            if fi <= fj:
                out[idx] = fi
                i += 1
            else:
                out[idx] = fj
                j -= 1
            idx += 1
    return out
