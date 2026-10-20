from solution import maximum_unique_subarray


def test_maximum_unique_subarray_normal():
    assert maximum_unique_subarray([4, 2, 4, 5, 6]) == 17


def test_maximum_unique_subarray_repeating():
    assert maximum_unique_subarray([5, 2, 1, 2, 5, 2, 1, 2, 5]) == 8
