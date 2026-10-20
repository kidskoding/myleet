from solution import largest_1_bordered_square


def test_largest_1_bordered_square_hollow_square():
    assert largest_1_bordered_square([[1, 1, 1], [1, 0, 1], [1, 1, 1]]) == 9


def test_largest_1_bordered_square_single_row():
    assert largest_1_bordered_square([[1, 1, 0, 0]]) == 1


def test_largest_1_bordered_square_all_zero():
    assert largest_1_bordered_square([[0, 0], [0, 0]]) == 0


def test_largest_1_bordered_square_all_ones():
    assert largest_1_bordered_square([[1, 1, 1], [1, 1, 1], [1, 1, 1]]) == 9


def test_largest_1_bordered_square_broken_border():
    assert largest_1_bordered_square([[1, 1, 1], [1, 0, 1], [1, 1, 0]]) == 1


def test_largest_1_bordered_square_offset_square():
    grid = [
        [0, 0, 0, 0],
        [0, 1, 1, 1],
        [0, 1, 0, 1],
        [1, 1, 1, 1],
    ]
    assert largest_1_bordered_square(grid) == 9
