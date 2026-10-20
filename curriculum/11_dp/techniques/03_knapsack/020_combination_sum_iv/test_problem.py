from solution import combination_sum4


def test_combination_sum4_counts_orderings():
    assert combination_sum4([1, 2, 3], 4) == 7


def test_combination_sum4_unreachable():
    assert combination_sum4([9], 3) == 0
