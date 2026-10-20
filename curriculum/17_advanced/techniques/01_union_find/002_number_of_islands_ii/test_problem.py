from solution import number_of_islands_ii


def test_number_of_islands_ii_sequence():
    result = number_of_islands_ii(3, 3, [[0, 0], [0, 1], [1, 2], [2, 1]])
    assert result == [1, 1, 2, 3]


def test_number_of_islands_ii_no_positions():
    assert number_of_islands_ii(2, 2, []) == []


def test_number_of_islands_ii_merges_component():
    result = number_of_islands_ii(1, 3, [[0, 0], [0, 2], [0, 1]])
    assert result == [1, 2, 1]
