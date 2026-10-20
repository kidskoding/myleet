from solution import h_index


def test_h_index_mixed():
    assert h_index([3, 0, 6, 1, 5]) == 3


def test_h_index_small():
    assert h_index([1, 3, 1]) == 1


def test_h_index_single_uncited():
    assert h_index([0]) == 0


def test_h_index_single_highly_cited():
    assert h_index([100]) == 1


def test_h_index_all_zero():
    assert h_index([0, 0, 0]) == 0


def test_h_index_all_equal_to_length():
    assert h_index([4, 4, 4, 4]) == 4
