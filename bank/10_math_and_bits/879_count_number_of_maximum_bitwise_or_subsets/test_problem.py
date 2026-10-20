from solution import count_max_or_subsets


def test_count_max_or_subsets_two_elements():
    assert count_max_or_subsets([3, 1]) == 2


def test_count_max_or_subsets_all_equal():
    assert count_max_or_subsets([2, 2, 2]) == 7


def test_count_max_or_subsets_example():
    assert count_max_or_subsets([3, 2, 1, 5]) == 6


def test_count_max_or_subsets_single():
    assert count_max_or_subsets([5]) == 1


def test_count_max_or_subsets_disjoint_bits_need_all():
    assert count_max_or_subsets([1, 2, 4]) == 1
