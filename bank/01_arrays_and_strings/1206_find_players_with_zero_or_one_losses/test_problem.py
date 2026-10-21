from solution import find_winners


def test_find_winners_example_one():
    matches = [
        [1, 3],
        [2, 3],
        [3, 6],
        [5, 6],
        [5, 7],
        [4, 5],
        [4, 8],
        [4, 9],
        [10, 4],
        [10, 9],
    ]
    assert find_winners(matches) == [[1, 2, 10], [4, 5, 7, 8]]


def test_find_winners_example_two():
    assert find_winners([[2, 3], [1, 3], [5, 4], [6, 4]]) == [[1, 2, 5, 6], []]


def test_find_winners_single_match():
    assert find_winners([[1, 2]]) == [[1], [2]]
