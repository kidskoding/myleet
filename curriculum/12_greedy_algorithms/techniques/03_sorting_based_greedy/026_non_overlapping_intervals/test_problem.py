from solution import erase_overlap_intervals


def test_erase_overlap_intervals_normal():
    assert erase_overlap_intervals([[1, 2], [2, 3], [3, 4], [1, 3]]) == 1


def test_erase_overlap_intervals_no_overlap():
    assert erase_overlap_intervals([[1, 2], [2, 3]]) == 0


def test_erase_overlap_intervals_single():
    assert erase_overlap_intervals([[1, 2]]) == 0


def test_erase_overlap_intervals_empty():
    assert erase_overlap_intervals([]) == 0
