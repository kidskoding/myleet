from solution import make_similar


def test_make_similar_even_numbers():
    assert make_similar([8, 12, 6], [2, 14, 10]) == 2


def test_make_similar_mixed_parity():
    assert make_similar([1, 2, 5], [4, 1, 3]) == 1


def test_make_similar_identical():
    assert make_similar([1, 1, 1, 1, 1], [1, 1, 1, 1, 1]) == 0


def test_make_similar_permutation():
    assert make_similar([1, 3], [3, 1]) == 0


def test_make_similar_one_operation():
    assert make_similar([2, 6], [4, 4]) == 1


def test_make_similar_large_gap():
    assert make_similar([2, 1_000_000], [500_000, 500_002]) == 249_999
