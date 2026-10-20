from solution import min_moves_to_capture_the_queen


def test_min_moves_no_attack_needs_two():
    assert min_moves_to_capture_the_queen(1, 1, 8, 8, 2, 3) == 2


def test_min_moves_both_attack():
    assert min_moves_to_capture_the_queen(5, 3, 3, 4, 5, 2) == 1


def test_min_moves_rook_blocked_by_bishop():
    assert min_moves_to_capture_the_queen(1, 1, 1, 2, 1, 3) == 2


def test_min_moves_bishop_blocked_by_rook():
    assert min_moves_to_capture_the_queen(2, 2, 1, 1, 3, 3) == 2


def test_min_moves_bishop_clear_diagonal():
    assert min_moves_to_capture_the_queen(4, 1, 1, 1, 3, 3) == 1


def test_min_moves_rook_column_clear():
    assert min_moves_to_capture_the_queen(1, 5, 2, 4, 8, 5) == 1
