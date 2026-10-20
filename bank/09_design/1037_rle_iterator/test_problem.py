from solution import RLEIterator


def test_rle_iterator_example():
    it = RLEIterator([3, 8, 0, 9, 2, 5])
    assert it.next(2) == 8
    assert it.next(1) == 8
    assert it.next(1) == 5
    assert it.next(2) == -1


def test_rle_iterator_exhausted_stays_exhausted():
    it = RLEIterator([1, 4])
    assert it.next(2) == -1
    assert it.next(1) == -1


def test_rle_iterator_zero_counts_skipped():
    it = RLEIterator([0, 1, 0, 2, 3, 7])
    assert it.next(3) == 7
    assert it.next(1) == -1


def test_rle_iterator_spans_multiple_runs():
    it = RLEIterator([2, 1, 2, 2, 2, 3])
    assert it.next(5) == 3
    assert it.next(1) == 3
    assert it.next(1) == -1


def test_rle_iterator_huge_counts():
    it = RLEIterator([10**9, 6, 10**9, 9])
    assert it.next(10**9) == 6
    assert it.next(1) == 9
