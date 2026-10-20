from solution import smallest_range


def test_smallest_range_normal():
    nums = [[4, 10, 15, 24, 26], [0, 9, 12, 20], [5, 18, 22, 30]]
    assert smallest_range(nums) == [20, 24]


def test_smallest_range_single_list():
    assert smallest_range([[1, 2, 3]]) == [1, 1]


def test_smallest_range_all_same_value():
    assert smallest_range([[1, 1], [1, 1]]) == [1, 1]
