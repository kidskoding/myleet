from solution import num_subseq


def test_num_subseq_normal():
    assert num_subseq([3, 5, 6, 7], 9) == 4


def test_num_subseq_with_duplicates():
    assert num_subseq([3, 3, 6, 8], 10) == 6


def test_num_subseq_larger():
    assert num_subseq([2, 3, 3, 4, 6, 7], 12) == 61
