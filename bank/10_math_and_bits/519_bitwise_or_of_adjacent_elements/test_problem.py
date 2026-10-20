from solution import or_array


def test_or_array_nested_masks():
    assert or_array([1, 3, 7, 15]) == [3, 7, 15]


def test_or_array_disjoint_bits():
    assert or_array([8, 4, 2]) == [12, 6]


def test_or_array_mixed():
    assert or_array([5, 4, 9, 11]) == [5, 13, 11]


def test_or_array_two_zeros():
    assert or_array([0, 0]) == [0]


def test_or_array_repeated_value():
    assert or_array([6, 6, 6]) == [6, 6]
