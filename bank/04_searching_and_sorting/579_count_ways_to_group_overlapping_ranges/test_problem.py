from solution import count_ways


def test_count_ways_one_overlapping_group():
    assert count_ways([[6, 10], [5, 15]]) == 2


def test_count_ways_chain_and_loner():
    assert count_ways([[1, 3], [10, 20], [2, 5], [4, 8]]) == 4


def test_count_ways_single_range():
    assert count_ways([[0, 0]]) == 2


def test_count_ways_shared_endpoint_overlaps():
    assert count_ways([[1, 2], [2, 3]]) == 2


def test_count_ways_disjoint_ranges():
    assert count_ways([[1, 2], [3, 4], [5, 6]]) == 8


def test_count_ways_many_groups_reduced_mod():
    assert count_ways([[2 * i, 2 * i] for i in range(40)]) == pow(2, 40, 10**9 + 7)
