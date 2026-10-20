from solution import constrained_subset_sum


def test_constrained_subset_sum_normal():
    assert constrained_subset_sum([10, 2, -10, 5, 20], 2) == 37


def test_constrained_subset_sum_all_negative():
    assert constrained_subset_sum([-1, -2, -3], 1) == -1


def test_constrained_subset_sum_skips_negatives():
    assert constrained_subset_sum([10, -2, -10, -5, 20], 2) == 23
