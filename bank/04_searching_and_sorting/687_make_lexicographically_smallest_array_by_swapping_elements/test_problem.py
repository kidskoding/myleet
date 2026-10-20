from solution import lexicographically_smallest_array


def test_lexicographically_smallest_array_example_one():
    assert lexicographically_smallest_array([1, 5, 3, 9, 8], 2) == [1, 3, 5, 8, 9]


def test_lexicographically_smallest_array_example_two():
    assert lexicographically_smallest_array([1, 7, 6, 18, 2, 1], 3) == [1, 6, 7, 18, 1, 2]


def test_lexicographically_smallest_array_no_swaps():
    assert lexicographically_smallest_array([1, 7, 28, 19, 10], 3) == [1, 7, 28, 19, 10]


def test_lexicographically_smallest_array_single():
    assert lexicographically_smallest_array([4], 1) == [4]


def test_lexicographically_smallest_array_chain_connects_far_values():
    assert lexicographically_smallest_array([10, 1, 4, 7], 3) == [1, 4, 7, 10]


def test_lexicographically_smallest_array_duplicates():
    assert lexicographically_smallest_array([5, 5, 1, 1], 4) == [1, 1, 5, 5]
