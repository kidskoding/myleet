from solution import previous_permutation_with_one_swap


def test_previous_permutation_with_one_swap_basic():
    assert previous_permutation_with_one_swap([3, 2, 1]) == [3, 1, 2]


def test_previous_permutation_with_one_swap_already_smallest():
    assert previous_permutation_with_one_swap([1, 1, 5]) == [1, 1, 5]


def test_previous_permutation_with_one_swap_example_three():
    assert previous_permutation_with_one_swap([1, 9, 4, 6, 7]) == [1, 7, 4, 6, 9]


def test_previous_permutation_with_one_swap_duplicates():
    assert previous_permutation_with_one_swap([3, 1, 1, 3]) == [1, 3, 1, 3]


def test_previous_permutation_with_one_swap_two_elements():
    assert previous_permutation_with_one_swap([2, 1]) == [1, 2]
