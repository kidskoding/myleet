from solution import sort_array_by_parity


def check(nums):
    result = sort_array_by_parity(list(nums))
    assert sorted(result) == sorted(nums)
    parities = [x % 2 for x in result]
    assert parities == sorted(parities)


def test_sort_array_by_parity_mixed():
    check([3, 1, 2, 4])


def test_sort_array_by_parity_single_zero():
    assert sort_array_by_parity([0]) == [0]


def test_sort_array_by_parity_all_odd():
    check([1, 3, 5, 7])


def test_sort_array_by_parity_all_even():
    check([8, 2, 6])


def test_sort_array_by_parity_alternating_with_duplicates():
    check([1, 2, 1, 2, 3, 4, 5000, 4999])
