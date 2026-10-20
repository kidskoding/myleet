from solution import maximize_sweetness


def test_maximize_sweetness_increasing_chunks():
    assert maximize_sweetness([1, 2, 3, 4, 5, 6, 7, 8, 9], 5) == 6


def test_maximize_sweetness_every_chunk_separate():
    assert maximize_sweetness([5, 6, 7, 8, 9, 1, 2, 3, 4], 8) == 1


def test_maximize_sweetness_equal_thirds():
    assert maximize_sweetness([1, 2, 2, 1, 2, 2, 1, 2, 2], 2) == 5


def test_maximize_sweetness_no_cuts():
    assert maximize_sweetness([1, 2, 3], 0) == 6


def test_maximize_sweetness_uniform_chunks():
    assert maximize_sweetness([5, 5, 5, 5], 3) == 5


def test_maximize_sweetness_big_middle_chunk():
    assert maximize_sweetness([1, 10, 1, 10], 1) == 11
