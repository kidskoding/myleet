from solution import count_combinations


def test_count_combinations_example_rook_corner():
    assert count_combinations(["rook"], [[1, 1]]) == 15


def test_count_combinations_example_queen_corner():
    assert count_combinations(["queen"], [[1, 1]]) == 22


def test_count_combinations_example_bishop():
    assert count_combinations(["bishop"], [[4, 3]]) == 12


def test_count_combinations_two_rooks_opposite_corners():
    assert count_combinations(["rook", "rook"], [[1, 1], [8, 8]]) == 223


def test_count_combinations_queen_and_bishop():
    assert count_combinations(["queen", "bishop"], [[5, 7], [3, 4]]) == 281
