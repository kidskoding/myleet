from solution import four_sum_count


def test_four_sum_count_two_tuples():
    assert four_sum_count([1, 2], [-2, -1], [-1, 2], [0, 2]) == 2


def test_four_sum_count_all_zeros():
    assert four_sum_count([0], [0], [0], [0]) == 1


def test_four_sum_count_no_match():
    assert four_sum_count([1], [1], [1], [1]) == 0


def test_four_sum_count_counts_every_index_combination():
    """Duplicates must multiply, not collapse.

    Every one of the 2*2*2*2 index choices sums to zero. A solution that stores
    pair sums in a set rather than a counter returns 4 here and still passes
    every other test in this file.
    """
    assert four_sum_count([0, 0], [0, 0], [0, 0], [0, 0]) == 16


def test_four_sum_count_duplicates_across_arrays():
    assert four_sum_count([1, 1], [-1, -1], [0, 0], [0, 0]) == 16


def test_four_sum_count_mixed_signs():
    assert four_sum_count([-1, -1], [-1, 1], [-1, 1], [1, -1]) == 6
