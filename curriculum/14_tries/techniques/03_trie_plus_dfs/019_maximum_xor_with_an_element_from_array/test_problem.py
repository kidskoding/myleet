from solution import maximize_xor


def test_maximize_xor_normal():
    assert maximize_xor([0, 1, 2, 3, 4], [[3, 1], [1, 3], [5, 6]]) == [3, 3, 7]


def test_maximize_xor_with_impossible_query():
    assert maximize_xor([5, 2, 4, 6, 6, 3], [[12, 4], [8, 1], [6, 3]]) == [15, -1, 5]
