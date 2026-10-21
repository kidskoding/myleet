def sort_array(nums: list[int]) -> list[int]:
    # Problem 52: Sort an Array
    # Time: O(n log n)
    # Space: O(n)

    def merge_sort(arr: list[int]) -> list[int]:
        if len(arr) <= 1:
            return arr
        mid = len(arr) // 2
        left = merge_sort(arr[:mid])
        right = merge_sort(arr[mid:])
        return merge(left, right)

    def merge(a: list[int], b: list[int]) -> list[int]:
        i = j = 0
        out: list[int] = []
        while i < len(a) and j < len(b):
            if a[i] <= b[j]:
                out.append(a[i])
                i += 1
            else:
                out.append(b[j])
                j += 1
        out.extend(a[i:])
        out.extend(b[j:])
        return out

    return merge_sort(nums)
