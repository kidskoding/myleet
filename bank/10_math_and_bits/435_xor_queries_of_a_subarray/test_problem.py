from solution import xor_queries


def test_xor_queries_example_one():
    assert xor_queries([1, 3, 4, 8], [[0, 1], [1, 2], [0, 3], [3, 3]]) == [2, 7, 14, 8]


def test_xor_queries_example_two():
    assert xor_queries([4, 8, 2, 10], [[2, 3], [1, 3], [0, 0], [0, 3]]) == [8, 0, 4, 4]


def test_xor_queries_single_element():
    assert xor_queries([5], [[0, 0]]) == [5]


def test_xor_queries_no_queries():
    assert xor_queries([1, 2, 3], []) == []


def test_xor_queries_duplicates_cancel():
    assert xor_queries([7, 7, 7, 7], [[0, 1], [0, 2], [1, 3]]) == [0, 7, 7]
