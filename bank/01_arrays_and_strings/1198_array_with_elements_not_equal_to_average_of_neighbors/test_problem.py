from solution import rearrange_array


def _valid(arr: list[int]) -> bool:
    for i in range(1, len(arr) - 1):
        if arr[i - 1] + arr[i + 1] == 2 * arr[i]:
            return False
    return True


def test_rearrange_array_example_one():
    nums = [1, 2, 3, 4, 5]
    assert sorted(rearrange_array(nums)) == sorted(nums)
    assert _valid(rearrange_array(nums))


def test_rearrange_array_example_two():
    nums = [6, 2, 0, 9, 7]
    assert sorted(rearrange_array(nums)) == sorted(nums)
    assert _valid(rearrange_array(nums))


def test_rearrange_array_two_elements():
    assert rearrange_array([1, 2]) in ([1, 2], [2, 1])


def test_rearrange_array_duplicates():
    nums = [1, 1, 2, 2, 3]
    out = rearrange_array(nums)
    assert sorted(out) == sorted(nums)
    assert _valid(out)


def test_rearrange_array_already_ok():
    nums = [1, 3, 2]
    out = rearrange_array(nums)
    assert sorted(out) == sorted(nums)
    assert _valid(out)
