from solution import sort_jumbled


def test_sort_jumbled_equal_keys_keep_order():
    assert sort_jumbled([8, 9, 4, 0, 2, 1, 3, 5, 7, 6], [991, 338, 38]) == [338, 38, 991]


def test_sort_jumbled_identity_mapping():
    assert sort_jumbled([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [789, 456, 123]) == [123, 456, 789]


def test_sort_jumbled_reversed_digits():
    assert sort_jumbled([9, 8, 7, 6, 5, 4, 3, 2, 1, 0], [0, 1, 2]) == [2, 1, 0]


def test_sort_jumbled_zero_digit_mapped():
    assert sort_jumbled([1, 0, 2, 3, 4, 5, 6, 7, 8, 9], [10, 1, 0, 100]) == [1, 10, 0, 100]


def test_sort_jumbled_single():
    assert sort_jumbled([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0]) == [0]
