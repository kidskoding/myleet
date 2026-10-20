from solution import sub_array_ranges


def test_sub_array_ranges_normal():
    assert sub_array_ranges([1, 2, 3]) == 4


def test_sub_array_ranges_with_duplicates():
    assert sub_array_ranges([1, 3, 3]) == 4


def test_sub_array_ranges_with_negatives():
    assert sub_array_ranges([4, -2, -3, 4, 1]) == 59
