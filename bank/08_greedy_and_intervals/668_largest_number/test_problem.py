from solution import largest_number


def test_largest_number_two_values():
    assert largest_number([10, 2]) == "210"


def test_largest_number_example_two():
    assert largest_number([3, 30, 34, 5, 9]) == "9534330"


def test_largest_number_all_zeros():
    assert largest_number([0, 0]) == "0"


def test_largest_number_single():
    assert largest_number([1]) == "1"


def test_largest_number_shared_prefix():
    assert largest_number([432, 43243]) == "43243432"


def test_largest_number_zero_last():
    assert largest_number([0, 9, 90]) == "9900"
