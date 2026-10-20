from solution import FindSumPairs


def test_find_sum_pairs_example():
    pairs = FindSumPairs([1, 1, 2, 2, 2, 3], [1, 4, 5, 2, 5, 4])
    assert pairs.count(7) == 8
    pairs.add(3, 2)
    assert pairs.count(8) == 2
    assert pairs.count(4) == 1
    pairs.add(0, 1)
    pairs.add(1, 1)
    assert pairs.count(7) == 11


def test_find_sum_pairs_no_match():
    pairs = FindSumPairs([1], [1])
    assert pairs.count(5) == 0


def test_find_sum_pairs_add_creates_match():
    pairs = FindSumPairs([1], [1])
    assert pairs.count(3) == 0
    pairs.add(0, 1)
    assert pairs.count(3) == 1
    assert pairs.count(2) == 0


def test_find_sum_pairs_duplicates_multiply():
    pairs = FindSumPairs([2, 2], [3, 3, 3])
    assert pairs.count(5) == 6
    pairs.add(1, 10)
    assert pairs.count(5) == 4
    assert pairs.count(15) == 2
