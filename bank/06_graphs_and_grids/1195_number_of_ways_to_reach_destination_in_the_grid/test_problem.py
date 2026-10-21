from solution import number_of_ways


def test_number_of_ways_stay_then_leave():
    # 3x3, k=1, source==dest → 0 ways (must move)
    assert number_of_ways(3, 3, 1, [1, 1], [1, 1]) == 0


def test_number_of_ways_adjacent_same_row():
    assert number_of_ways(3, 3, 1, [1, 1], [1, 2]) == 1


def test_number_of_ways_two_steps_back():
    assert number_of_ways(3, 3, 2, [1, 1], [1, 1]) == 4


def test_number_of_ways_diagonal_one_step():
    assert number_of_ways(3, 3, 1, [1, 1], [2, 2]) == 0


def test_number_of_ways_diagonal_two_steps():
    assert number_of_ways(3, 3, 2, [1, 1], [2, 2]) == 2
