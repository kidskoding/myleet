def previous_permutation_with_one_swap(arr: list[int]) -> list[int]:
    arr = arr[:]
    n = len(arr)
    i = n - 2
    while i >= 0 and arr[i] <= arr[i + 1]:
        i -= 1
    if i < 0:
        return arr
    j = n - 1
    while arr[j] >= arr[i] or (j > 0 and arr[j] == arr[j - 1]):
        j -= 1
    arr[i], arr[j] = arr[j], arr[i]
    return arr
