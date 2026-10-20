from solution import sorted_squares


def test_sorted_squares_empty():
    assert sorted_squares([]) == []


def test_sorted_squares_single():
    assert sorted_squares([3]) == [9]


def test_sorted_squares_negatives_and_positives():
    assert sorted_squares([-4, -1, 0, 3, 10]) == [0, 1, 9, 16, 100]


def test_sorted_squares_all_negative():
    assert sorted_squares([-7, -3, -1]) == [1, 9, 49]
